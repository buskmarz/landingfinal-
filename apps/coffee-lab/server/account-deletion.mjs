import { APIError, createAuthMiddleware, getAuthoritativeSessionFromCtx } from 'better-auth/api';

export function requireConfirmedAccount(origin, readNativeSession) {
  return createAuthMiddleware(async context => {
    if (!['/delete-user', '/device/approve', '/device/deny'].includes(context.path)) return;
    const original = context.request?.headers || context.headers;
    const nativeDeletion = context.path === '/delete-user' && !original?.has('origin') &&
      !original?.has('cookie') && /^Bearer [^\s]+$/i.test(original?.get('authorization') || '');
    if (context.headers?.get('origin') !== origin && !nativeDeletion) {
      throw new APIError('FORBIDDEN', { message: 'Solicitud no permitida.' });
    }
    // Better Auth applies bearer conversion after before-hooks have run.
    const session = nativeDeletion
      ? await readNativeSession?.(original)
      : await getAuthoritativeSessionFromCtx(context);
    if (!session) throw new APIError('UNAUTHORIZED', { message: 'Inicia sesión para continuar.' });
    if (context.headers.get('x-coffee-account') !== session.user.id) {
      const message = context.path === '/delete-user'
        ? 'La cuenta cambió. Vuelve a revisar antes de eliminar.'
        : 'La cuenta cambió. Revisa otra vez la conexión del dispositivo.';
      throw new APIError('CONFLICT', { message });
    }
  });
}

export function revokeAppleBeforeDeletion(db, apple, fetcher = fetch, nativeApple) {
  return async user => {
    const accounts = db.prepare(`SELECT refreshToken, accessToken FROM account
      WHERE userId = ? AND providerId = 'apple'`).all(user.id);
    const credentials = accounts.map(account => ({...account, config: apple}));
    const nativeGrant = nativeApple?.grants.get(user.id);
    if (nativeGrant) credentials.push({refreshToken: nativeGrant.refreshToken,
      config: nativeApple.config?.clientId === nativeGrant.clientId ? nativeApple.config : undefined});
    for (const {refreshToken, accessToken, config} of credentials) {
      const token = refreshToken || accessToken;
      // A legacy account with no token still has a right to delete its server data.
      if (!token) continue;
      const retry = 'No se pudo revocar el acceso de Apple. Tu cuenta sigue disponible. Intenta de nuevo.';
      if (!config) throw new APIError('SERVICE_UNAVAILABLE', { message: retry });
      const body = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        token,
        token_type_hint: refreshToken ? 'refresh_token' : 'access_token',
      });
      const result = await fetcher('https://appleid.apple.com/auth/revoke', {
        method: 'POST', body, redirect: 'error', signal: AbortSignal.timeout(8000),
      }).catch(() => null);
      if (!result?.ok) throw new APIError('SERVICE_UNAVAILABLE', { message: retry });
    }
  };
}
