import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, verify } from 'node:crypto';
import { once } from 'node:events';
import Database from 'better-sqlite3';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { testUtils } from 'better-auth/plugins';
import { apple } from 'better-auth/social-providers';
import { createAccountServer } from '../server/account-server.mjs';
import { requireConfirmedAccount, revokeAppleBeforeDeletion } from '../server/account-deletion.mjs';
import { appleNativeAccess, appleNativeConfig, appleNativeGrantStore } from '../server/apple-native.mjs';
import { deviceAccessPlugins } from '../server/device-access.mjs';
import { defaultConfig, RECIPES } from '../lib/coffee/domain.ts';

test('the private Apple key signs a short client secret for the native App ID', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const teamId = 'TEAMTEST01';
  const keyId = 'KEYTEST001';
  const clientId = 'com.bmoodcoffee.lab.preview';
  const config = appleNativeConfig({ clientId, teamId, keyId, privateKey: privateKey.export({ format: 'pem', type: 'pkcs8' }) });
  const [header, payload, signature] = config.clientSecret.split('.');
  const decode = value => JSON.parse(Buffer.from(value, 'base64url'));
  assert.deepEqual(decode(header), { alg: 'ES256', kid: keyId });
  const claims = decode(payload);
  assert.equal(claims.iss, teamId);
  assert.equal(claims.aud, 'https://appleid.apple.com');
  assert.equal(claims.sub, clientId);
  assert.equal(claims.exp - claims.iat, 600);
  assert.ok(verify('sha256', Buffer.from(header + '.' + payload), { key: publicKey, dsaEncoding: 'ieee-p1363' },
    Buffer.from(signature, 'base64url')));
});

test('native Apple authorizes one signed challenge, uses the recipe account and revokes the matching grant', async t => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  const origin = 'http://127.0.0.1:5198';
  const config = { clientId: 'com.bmoodcoffee.lab.preview', clientSecret: 'simulated-client-secret' };
  const grants = appleNativeGrantStore(db);
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const provider = apple(config);
  provider.idToken = { ...provider.idToken, jwks: async () => publicKey };
  const signedToken = claims => {
    const now = Math.floor(Date.now() / 1000);
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const payload = { iss: 'https://appleid.apple.com', aud: config.clientId, sub: 'apple-test-person',
      iat: now, exp: now + 300, email: 'apple-test@example.test', email_verified: true, ...claims };
    const message = encode({ alg: 'RS256', kid: 'test-key' }) + '.' + encode(payload);
    return message + '.' + sign('sha256', Buffer.from(message), privateKey).toString('base64url');
  };
  const exchanges = [];
  const revocations = [];
  const exchange = async (url, request) => {
    assert.equal(url, 'https://appleid.apple.com/auth/token');
    const body = Object.fromEntries(request.body);
    exchanges.push(body.code);
    assert.deepEqual(body, { client_id: config.clientId, client_secret: config.clientSecret,
      grant_type: 'authorization_code', code: body.code });
    return Response.json({ refresh_token: 'native-refresh', id_token: signedToken(
      body.code === 'different-user' ? { sub: 'different-apple-user' } : {},
    ) });
  };
  const revoke = async (url, request) => {
    assert.equal(url, 'https://appleid.apple.com/auth/revoke');
    revocations.push(Object.fromEntries(request.body));
    return new Response(null, { status: 200 });
  };
  const options = {
    baseURL: origin, basePath: '/coffee-lab/api/auth', database: db,
    secret: 'isolated-native-apple-coffee-lab-test-secret', account: { accountLinking: { enabled: false } },
    plugins: [...deviceAccessPlugins(origin), appleNativeAccess(config, grants, { fetcher: exchange, provider }), testUtils()],
    hooks: { before: requireConfirmedAccount(origin, headers => auth.api.getSession({ headers })) },
    user: { deleteUser: { enabled: true, beforeDelete: revokeAppleBeforeDeletion(db,
      { clientId: 'apple.web.service', clientSecret: 'web-secret' }, revoke, { config, grants }) } },
  };
  await (await getMigrations(options)).runMigrations();
  const auth = betterAuth(options);
  const server = createAccountServer({ auth, db, origin, providers: [], nativeAppleClientId: config.clientId });
  t.after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/coffee-lab/api`;
  const post = (path, body, headers = {}) => fetch(base + path, { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const challengePath = '/auth/apple-native/challenge';
  const signInPath = '/auth/apple-native/sign-in';
  const challenge = async () => {
    const response = await post(challengePath, {});
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const value = await response.json();
    assert.equal(value.clientId, config.clientId);
    return value.nonce;
  };
  assert.equal((await post(challengePath, {}, { Origin: origin })).status, 403);
  assert.equal((await post(challengePath, {}, { 'Sec-Fetch-Site': 'same-origin' })).status, 403);
  const caps = await (await fetch(base + '/capabilities')).json();
  assert.deepEqual(caps.providers, []);
  assert.equal(caps.nativeAppleClientId, config.clientId);

  let nonce = await challenge();
  assert.equal((await post(signInPath, { nonce, identityToken: signedToken({ nonce: 'different' }), code: 'wrong-nonce' })).status, 401);
  nonce = await challenge();
  assert.equal((await post(signInPath, { nonce, identityToken: signedToken({ nonce, aud: 'other.app' }), code: 'wrong-audience' })).status, 401);
  assert.deepEqual(exchanges, []);
  nonce = await challenge();
  assert.equal((await post(signInPath, { nonce, identityToken: signedToken({ nonce }), code: 'different-user' })).status, 401);

  nonce = await challenge();
  const proof = { nonce, identityToken: signedToken({ nonce }), code: 'valid-code' };
  const responses = await Promise.all([post(signInPath, proof), post(signInPath, proof)]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 401]);
  assert.deepEqual(exchanges, ['different-user', 'valid-code']);
  const approved = responses.find(r => r.ok);
  assert.equal(approved.headers.get('set-cookie'), null);
  const credential = await approved.json();
  assert.deepEqual(Object.keys(credential), ['token']);
  const headers = { Authorization: 'Bearer ' + credential.token };
  const signedIn = await (await fetch(base + '/auth/get-session', { headers })).json();
  const owner = signedIn.user.id;
  assert.equal(signedIn.user.email, 'apple-test@example.test');
  assert.equal(signedIn.session.token, undefined);
  assert.deepEqual(grants.get(owner), { clientId: config.clientId, refreshToken: 'native-refresh' });
  headers['X-Coffee-Account'] = owner;
  const recipe = { id: 'test-apple-recipe', title: 'V60 Apple', createdAt: 1, config: defaultConfig(RECIPES[0]) };
  assert.equal((await post('/recipe-library', { revision: null, mutationId: crypto.randomUUID(), recipes: [recipe] }, headers)).status, 200);
  assert.equal((await (await fetch(base + '/recipe-library', { headers })).json()).recipes[0].title, recipe.title);

  // A grouped web login can retain its own refresh token for the same Apple subject.
  db.prepare("UPDATE account SET refreshToken = ? WHERE providerId = 'apple' AND userId = ?").run('web-refresh', owner);
  assert.equal((await post('/auth/delete-user', {}, headers)).status, 200);
  assert.deepEqual(revocations.map(({ client_id, token }) => [client_id, token]), [
    ['apple.web.service', 'web-refresh'], [config.clientId, 'native-refresh'],
  ]);
  assert.equal(grants.get(owner), undefined);
  assert.equal((await fetch(base + '/recipe-library', { headers })).status, 401);
});
