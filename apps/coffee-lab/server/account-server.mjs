import { createServer } from 'node:http';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { cleanRecipe, recipeDigest } from '../lib/coffee/recipe-sync.ts';
import { createRecipeLibrary } from './recipe-library.mjs';

const authPaths = new Set([
  'get-session', 'sign-in/social', 'callback/google', 'callback/apple', 'error',
  'sign-out', 'delete-user', 'device', 'device/code', 'device/token', 'device/approve', 'device/deny',
]);
const nativeApplePaths = new Set(['apple-native/challenge', 'apple-native/sign-in']);

function reply(response, status, data) {
  response.writeHead(status, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'});
  response.end(JSON.stringify(data));
}

export function createAccountServer({ auth, db, origin, providers, nativeAppleClientId, local = true }) {
  const library = createRecipeLibrary(db);
  db.exec(`CREATE TABLE IF NOT EXISTS coffee_recipe_versions (
    owner TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    digest TEXT NOT NULL,
    payload TEXT NOT NULL,
    PRIMARY KEY(owner, digest)
  )`);
  const authHandler = toNodeHandler(async request => {
    const response = await auth.handler(request);
    // The native device grant returns its own token. Keep browser sessions HttpOnly.
    const headers = new Headers(response.headers);
    headers.delete('set-auth-token');
    headers.delete('access-control-expose-headers');
    if (new URL(request.url).pathname.startsWith('/coffee-lab/api/auth/apple-native/')) {
      headers.set('Cache-Control', 'no-store');
    }
    if (new URL(request.url).pathname === '/coffee-lab/api/auth/get-session' && response.ok) {
      const value = await response.json();
      if (value?.session) delete value.session.token;
      return Response.json(value, {status: response.status, headers});
    }
    return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
  });
  const insert = db.prepare('INSERT OR IGNORE INTO coffee_recipe_versions(owner,digest,payload) VALUES (?,?,?)');
  const list = db.prepare('SELECT payload FROM coffee_recipe_versions WHERE owner=? ORDER BY digest LIMIT 10001');
  const save = db.transaction((owner, versions) => {
    for (const version of versions) insert.run(owner, version.digest, version.payload);
    const rows = list.all(owner);
    if (rows.length > 10000) throw new RangeError('Demasiadas versiones.');
    return rows;
  });

  return createServer(async (request, response) => {
    try {
      if (!local && request.headers.host !== new URL(origin).host) {
        return reply(response, 400, {error: 'Origen no permitido.'});
      }
      const path = new URL(request.url, origin).pathname;
      if (path === '/coffee-lab/api/capabilities' && request.method === 'GET') {
        return reply(response, 200, { local, providers, recipeLibrary: true, nativeAppleClientId });
      }
      if (path.startsWith('/coffee-lab/api/auth/')) {
        const action = path.slice('/coffee-lab/api/auth/'.length);
        if (nativeApplePaths.has(action)) {
          if (!nativeAppleClientId) return reply(response, 404, {error: 'No encontrado.'});
          if (request.method !== 'POST' || request.headers.origin || request.headers.cookie ||
              request.headers.authorization || request.headers['sec-fetch-site'] ||
              request.headers['content-type']?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
            return reply(response, 403, {error: 'Solicitud no permitida.'});
          }
          return await authHandler(request, response);
        }
        if (!authPaths.has(action)) return reply(response, 404, {error: 'No encontrado.'});
        const browserRequest = request.headers.origin || request.headers.cookie;
        if (browserRequest && (request.headers.authorization ||
            action === 'device/code' || action === 'device/token')) {
          return reply(response, 403, {error: 'Solicitud no permitida.'});
        }
        return await authHandler(request, response);
      }
      const liveLibrary = path === '/coffee-lab/api/recipe-library';
      if (!liveLibrary && path !== '/coffee-lab/api/recipes') return reply(response, 404, {error: 'No encontrado.'});

      const headers = fromNodeHeaders(request.headers);
      const bearerRequest = /^Bearer [^\s]+$/i.test(request.headers.authorization || '');
      if (request.headers.authorization && (!bearerRequest || request.headers.cookie)) {
        return reply(response, 400, {error: 'Usa una sola sesión para esta solicitud.'});
      }
      const hasCredentials = request.headers.cookie || bearerRequest;
      const session = hasCredentials && await auth.api.getSession({ headers });
      if (!session) return reply(response, 401, {error: 'Inicia sesión para sincronizar.'});
      const owner = session.user.id;
      if (request.headers['x-coffee-account'] !== owner) {
        return reply(response, 409, {error: 'La cuenta cambió. Vuelve a revisar la copia.'});
      }

      if (request.method === 'GET') {
        if (liveLibrary) return reply(response, 200, library.read(owner));
        const rows = list.all(owner);
        if (rows.length > 10000) return reply(response, 409, {error: 'Demasiadas versiones. Exporta una copia.'});
        return reply(response, 200, {recipes: rows.map(row => JSON.parse(row.payload))});
      }
      if (request.method !== 'POST') return reply(response, 405, {error: 'Método no permitido.'});
      const contentType = request.headers['content-type']?.split(';', 1)[0].trim().toLowerCase();
      const permittedOrigin = bearerRequest ? !request.headers.origin : request.headers.origin === origin;
      if (!permittedOrigin || contentType !== 'application/json') {
        return reply(response, 403, {error: 'Solicitud no permitida.'});
      }
      const chunks = [];
      let bytes = 0;
      for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > 2 * 1024 * 1024) return reply(response, 413, {error: 'Copia demasiado grande.'});
        chunks.push(chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (liveLibrary) {
        const confirmed = await auth.api.getSession({headers});
        if (confirmed?.user.id !== owner) return reply(response, 401, {error: 'La sesión terminó. Inicia sesión otra vez.'});
        const result = library.write(owner, body);
        return reply(response, result.status, result.data);
      }
      if (!Array.isArray(body?.recipes) || body.recipes.length > 500) {
        return reply(response, 400, {error: 'Máximo 500 recetas por copia.'});
      }
      const versions = await Promise.all(body.recipes.map(async value => {
        const recipe = cleanRecipe(value);
        return {digest: await recipeDigest(recipe), payload: JSON.stringify(recipe)};
      }));
      // Revalidate after reading the body in case the session was revoked during upload.
      const confirmed = await auth.api.getSession({headers});
      if (confirmed?.user.id !== owner) return reply(response, 401, {error: 'La sesión terminó. Inicia sesión otra vez.'});
      const rows = save(owner, versions);
      return reply(response, 200, {recipes: rows.map(row => JSON.parse(row.payload))});
    } catch (error) {
      if (response.headersSent || response.destroyed) return;
      if (error instanceof RangeError && error.message === 'Demasiadas versiones.') {
        return reply(response, 409, {error: 'Demasiadas versiones. Exporta una copia.'});
      }
      return reply(response, 400, {error: 'No se pudo completar. Tus recetas locales se conservan.'});
    }
  });
}
