import { createPrivateKey, randomBytes, sign } from 'node:crypto';
import { APIError, createAuthEndpoint } from 'better-auth/api';
import { handleOAuthUserInfo, verifyProviderIdToken } from 'better-auth/oauth2';
import { apple } from 'better-auth/social-providers';
import { z } from 'zod';

const invalid = () => new APIError('UNAUTHORIZED', { message: 'Apple no pudo confirmar el acceso. Intenta de nuevo.' });

export function appleNativeConfig({ clientId, clientSecret, teamId, keyId, privateKey }) {
  if (!clientId) return undefined;
  if (clientSecret) return { clientId, clientSecret };
  if (!teamId || !keyId || !privateKey) return undefined;
  const key = createPrivateKey(privateKey);
  if (!/^[A-Z0-9]{10}$/.test(teamId) || !/^[A-Z0-9]{10}$/.test(keyId) ||
      key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') {
    throw new Error('La configuración de la clave de Apple no es válida.');
  }
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'ES256', kid: keyId });
  return {
    clientId,
    get clientSecret() {
      const now = Math.floor(Date.now() / 1000);
      const message = header + '.' + encode({ iss: teamId, sub: clientId,
        aud: 'https://appleid.apple.com', iat: now, exp: now + 600 });
      const signature = sign('sha256', Buffer.from(message), { key, dsaEncoding: 'ieee-p1363' });
      return message + '.' + signature.toString('base64url');
    },
  };
}

export function appleNativeGrantStore(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS coffee_apple_native_grants (
    user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL,
    refresh_token TEXT NOT NULL
  )`);
  return {
    get: userId => db.prepare(`SELECT client_id AS clientId, refresh_token AS refreshToken
      FROM coffee_apple_native_grants WHERE user_id = ?`).get(userId),
    save: (userId, clientId, refreshToken) => db.prepare(`INSERT INTO coffee_apple_native_grants (user_id, client_id, refresh_token)
      VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET client_id = excluded.client_id, refresh_token = excluded.refresh_token`)
      .run(userId, clientId, refreshToken),
  };
}

export function appleNativeAccess(config, grants, { fetcher = fetch, provider = apple(config) } = {}) {
  const nonces = new Map();
  const challenge = createAuthEndpoint('/apple-native/challenge', { method: 'POST' }, context => {
    const now = Date.now();
    for (const [value, expires] of nonces) if (expires <= now) nonces.delete(value);
    if (nonces.size >= 512) throw new APIError('TOO_MANY_REQUESTS', { message: 'Intenta de nuevo en unos minutos.' });
    const nonce = randomBytes(32).toString('hex');
    nonces.set(nonce, now + 300_000);
    return context.json({ nonce, clientId: config.clientId });
  });

  const signIn = createAuthEndpoint('/apple-native/sign-in', {
    method: 'POST',
    body: z.object({ nonce: z.string().regex(/^[0-9a-f]{64}$/), code: z.string().min(1).max(2048),
      identityToken: z.string().min(1).max(16384) }),
  }, async context => {
    const { nonce, code, identityToken } = context.body;
    const expires = nonces.get(nonce);
    nonces.delete(nonce);
    if (!expires || expires <= Date.now() || !await verifyProviderIdToken(provider, identityToken, nonce)) throw invalid();
    const identity = await provider.getUserInfo({ idToken: identityToken });
    const subject = identity?.data?.sub;
    if (typeof subject !== 'string' || !subject || !identity.user.email || !identity.user.emailVerified) throw invalid();

    const response = await fetcher('https://appleid.apple.com/auth/token', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000),
      body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret,
        grant_type: 'authorization_code', code }),
    }).catch(() => null);
    if (!response) throw new APIError('SERVICE_UNAVAILABLE', { message: 'Apple no respondió. Intenta de nuevo.' });
    const exchanged = response.ok ? await response.json().catch(() => null) : null;
    const refreshToken = exchanged?.refresh_token;
    const exchangedId = exchanged?.id_token;
    if (typeof refreshToken !== 'string' || !refreshToken || typeof exchangedId !== 'string') throw invalid();
    if (exchangedId !== identityToken) {
      if (!await verifyProviderIdToken(provider, exchangedId)) throw invalid();
      const verified = await provider.getUserInfo({ idToken: exchangedId });
      if (verified?.data?.sub !== subject) throw invalid();
    }

    const result = await handleOAuthUserInfo(context, {
      userInfo: { id: subject, email: identity.user.email, emailVerified: true, name: 'Cuenta Apple' },
      account: { providerId: 'apple', accountId: subject },
      requireExactAccountBinding: true,
    });
    if (!result.data) {
      throw new APIError('CONFLICT', { message: 'No se pudo abrir esta cuenta con Apple. Si ya usas otro acceso, continúa con ese acceso.' });
    }
    const { user, session } = result.data;
    try {
      grants.save(user.id, config.clientId, refreshToken);
    } catch {
      await context.context.internalAdapter.deleteSession(session.token);
      throw new APIError('SERVICE_UNAVAILABLE', { message: 'No se pudo guardar el acceso de Apple. Intenta de nuevo.' });
    }
    return context.json({ token: session.token });
  });

  return {
    id: 'coffee-apple-native',
    endpoints: { coffeeAppleChallenge: challenge, coffeeAppleSignIn: signIn },
    rateLimit: [{ pathMatcher: path => path.startsWith('/apple-native/'), window: 60, max: 12 }],
  };
}
