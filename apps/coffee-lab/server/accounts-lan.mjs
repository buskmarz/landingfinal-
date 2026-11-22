import { readFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { createServer } from 'node:https';
import { isIPv4 } from 'node:net';
import { pathToFileURL } from 'node:url';
import { X509Certificate } from 'node:crypto';

const publicPaths = new Set([
  'GET /coffee-lab/api/capabilities',
  'POST /coffee-lab/api/auth/device/code',
  'POST /coffee-lab/api/auth/device/token',
  'POST /coffee-lab/api/auth/apple-native/challenge',
  'POST /coffee-lab/api/auth/apple-native/sign-in',
]);
const protectedPaths = new Set([
  'GET /coffee-lab/api/auth/get-session',
  'POST /coffee-lab/api/auth/sign-out',
  'POST /coffee-lab/api/auth/delete-user',
  'GET /coffee-lab/api/recipe-library',
  'POST /coffee-lab/api/recipe-library',
  'GET /coffee-lab/api/recipes',
  'POST /coffee-lab/api/recipes',
]);

function isPrivateIPv4(value) {
  return isIPv4(value) && /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(value);
}

export function createAccountLanBridge({ host, peer, port, cert, key, upstreamPort = 5199 }) {
  if (!isPrivateIPv4(host) || !isPrivateIPv4(peer) || !Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('Indica IP privadas de la Mac y el iPhone, y un puerto entre 1024 y 65535.');
  }
  const certificate = new X509Certificate(cert);
  if (!certificate.checkIP(host) || Date.parse(certificate.validTo) <= Date.now()) {
    throw new Error('El certificado debe incluir la IP de la Mac y estar vigente.');
  }
  const reply = (response, status, error) => response.writeHead(status, {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store',
  }).end(JSON.stringify({ error }));
  const server = createServer({ cert, key, minVersion: 'TLSv1.2', requestTimeout: 15_000 }, (incoming, response) => {
    const route = incoming.method + ' ' + incoming.url;
    const bearer = /^Bearer [^\s]+$/i.test(incoming.headers.authorization || '');
    const isProtected = protectedPaths.has(route);
    if (incoming.socket.remoteAddress !== peer || incoming.headers.host !== `${host}:${port}` ||
        incoming.headers.cookie || incoming.headers.origin || incoming.headers['sec-fetch-site'] ||
        (isProtected ? !bearer : !publicPaths.has(route) || !!incoming.headers.authorization)) {
      return reply(response, 403, 'Solicitud no permitida.');
    }
    if (incoming.method === 'POST') {
      const length = Number(incoming.headers['content-length']);
      const limit = isProtected ? 2 * 1024 * 1024 : 32 * 1024;
      if (incoming.headers['transfer-encoding'] || !Number.isSafeInteger(length) || length < 2 || length > limit ||
          incoming.headers['content-type']?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
        return reply(response, 400, 'Solicitud inválida.');
      }
    }
    const headers = { accept: 'application/json', host: '127.0.0.1:5198' };
    for (const name of ['authorization', 'content-type', 'content-length', 'x-coffee-account']) {
      if (incoming.headers[name]) headers[name] = incoming.headers[name];
    }
    const upstream = httpRequest({ hostname: '127.0.0.1', port: upstreamPort, path: incoming.url,
      method: incoming.method, headers, signal: AbortSignal.timeout(13_000) }, answer => {
      if (answer.headers['content-type']?.split(';', 1)[0] !== 'application/json' ||
          (answer.statusCode >= 300 && answer.statusCode < 400)) {
        answer.resume();
        return reply(response, 502, 'Respuesta de cuentas inválida.');
      }
      response.writeHead(answer.statusCode, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      answer.on('error', () => response.destroy());
      answer.pipe(response);
    });
    upstream.on('error', () => {
      if (response.headersSent) response.destroy();
      else reply(response, 502, 'Servidor de cuentas no disponible.');
    });
    incoming.on('aborted', () => upstream.destroy());
    incoming.pipe(upstream);
  });
  return { server, fingerprint: certificate.fingerprint256.replaceAll(':', '').toLowerCase() };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const [host, peer, portString, certificatePath, keyPath] = process.argv.slice(2);
  if (!certificatePath || !keyPath) throw new Error('Uso: node server/accounts-lan.mjs IP_MAC IP_IPHONE PUERTO CERTIFICADO CLAVE_TLS');
  const port = Number(portString);
  const { server, fingerprint } = createAccountLanBridge({ host, peer, port,
    cert: readFileSync(certificatePath), key: readFileSync(keyPath) });
  server.listen(port, host, () => {
    console.log(`Coffee Lab HTTPS en https://${host}:${port}`);
    console.log(`COFFEE_ACCOUNTS_TLS_PIN=${fingerprint}`);
  });
}
