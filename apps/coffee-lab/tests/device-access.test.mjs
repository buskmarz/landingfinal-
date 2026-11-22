import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import Database from 'better-sqlite3';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { testUtils } from 'better-auth/plugins';
import { createAccountServer } from '../server/account-server.mjs';
import { requireConfirmedAccount } from '../server/account-deletion.mjs';
import { COFFEE_IOS_CLIENT, clearDeviceRequests, deviceAccessPlugins } from '../server/device-access.mjs';
import { defaultConfig, RECIPES } from '../lib/coffee/domain.ts';

test('a device gets a separate recipe session only after its code is reviewed and approved', async t => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  const origin = 'http://127.0.0.1:5198';
  const options = {
    baseURL: origin, basePath: '/coffee-lab/api/auth', database: db,
    secret: 'device-authorization-isolated-test-secret',
    plugins: [...deviceAccessPlugins(origin), testUtils()],
    hooks: {before: requireConfirmedAccount(origin, headers => auth.api.getSession({headers, query: {disableCookieCache: true}}))},
    user: {deleteUser: {enabled: true, afterDelete: clearDeviceRequests(db)}},
  };
  await (await getMigrations(options)).runMigrations();
  const auth = betterAuth(options);
  const helpers = (await auth.$context).test;
  const owner = await helpers.saveUser(helpers.createUser({email: 'device-owner@example.test'}));
  const otherUser = await helpers.saveUser(helpers.createUser({email: 'other-device@example.test'}));
  const browser = await helpers.login({userId: owner.id});
  const other = await helpers.login({userId: otherUser.id});
  const server = createAccountServer({auth, db, origin, providers: []});
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    db.close();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/coffee-lab/api`;
  const post = (path, body, headers = {}) => fetch(base + path, {
    method: 'POST', headers: {'Content-Type': 'application/json', ...headers}, body: JSON.stringify(body),
  });
  const browserHeaders = session => ({cookie: session.headers.get('cookie'), Origin: origin, 'X-Coffee-Account': session.user.id});
  const wrongClient = await post('/auth/device/code', {client_id: 'unknown-app'});
  assert.equal(wrongClient.status, 400);
  assert.equal((await post('/auth/device/code', {client_id: COFFEE_IOS_CLIENT}, browserHeaders(browser))).status, 403);
  const codes = await (await post('/auth/device/code', {client_id: COFFEE_IOS_CLIENT})).json();
  assert.equal(codes.expires_in, 300);
  assert.equal(codes.interval, 5);
  assert.equal(new URL(codes.verification_uri_complete).origin, origin);
  assert.equal(new URL(codes.verification_uri_complete).searchParams.get('user_code'), codes.user_code);
  const poll = client => post('/auth/device/token', {
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    device_code: codes.device_code, client_id: client,
  });
  assert.equal((await poll('different-app')).status, 400);
  const pending = await poll(COFFEE_IOS_CLIENT);
  assert.equal((await pending.json()).error, 'authorization_pending');
  assert.equal((await (await poll(COFFEE_IOS_CLIENT)).json()).error, 'slow_down');
  const review = await fetch(base + '/auth/device?user_code=' + encodeURIComponent(codes.user_code), {
    headers: browserHeaders(browser),
  });
  assert.equal(review.status, 200);
  assert.equal((await review.json()).client_id, COFFEE_IOS_CLIENT);
  const approve = headers => post('/auth/device/approve', {userCode: codes.user_code}, headers);
  assert.equal((await approve(browserHeaders(other))).status, 403);
  assert.equal((await approve({...browserHeaders(browser), 'X-Coffee-Account': otherUser.id})).status, 409);
  assert.equal((await approve({...browserHeaders(browser), Origin: 'https://foreign.example'})).status, 403);
  assert.equal((await approve(browserHeaders(browser))).status, 200);
  // Advance only the poll gate in this isolated DB, preserving the configured five-second interval.
  db.prepare('UPDATE deviceCode SET lastPolledAt = ?').run(Date.now() - 6000);
  const tokenResponse = await poll(COFFEE_IOS_CLIENT);
  assert.equal(tokenResponse.status, 200);
  const credentials = await tokenResponse.json();
  assert.equal(credentials.token_type, 'Bearer');
  assert.equal(tokenResponse.headers.get('set-auth-token'), null);
  const nativeHeaders = {Authorization: 'Bearer ' + credentials.access_token, 'X-Coffee-Account': owner.id};
  const nativeSession = await fetch(base + '/auth/get-session', {headers: nativeHeaders});
  const sessionPayload = await nativeSession.json();
  assert.equal(sessionPayload.user.id, owner.id);
  assert.equal(sessionPayload.session.token, undefined);
  assert.equal(nativeSession.headers.get('set-auth-token'), null);
  assert.equal((await fetch(base + '/auth/list-sessions', {headers: browserHeaders(browser)})).status, 404);
  const recipe = {id: 'from-ios', title: 'V60 desde iPhone', createdAt: 1, config: defaultConfig(RECIPES[0])};
  assert.equal((await post('/recipes', {recipes: [recipe]}, nativeHeaders)).status, 200);
  const restored = await fetch(base + '/recipes', {headers: browserHeaders(browser)});
  assert.equal((await restored.json()).recipes[0].title, recipe.title);
  assert.equal((await fetch(base + '/recipes', {headers: {...nativeHeaders, 'X-Coffee-Account': otherUser.id}})).status, 409);
  assert.equal((await post('/recipes', {recipes: []}, {...nativeHeaders, Origin: 'https://foreign.example'})).status, 403);
  assert.equal((await fetch(base + '/recipes', {headers: {...nativeHeaders, cookie: browser.headers.get('cookie')}})).status, 400);
  assert.equal((await poll(COFFEE_IOS_CLIENT)).status, 400);
  assert.equal((await post('/auth/sign-out', {}, nativeHeaders)).status, 200);
  assert.equal((await fetch(base + '/recipes', {headers: nativeHeaders})).status, 401);
  assert.equal((await fetch(base + '/recipes', {headers: browserHeaders(browser)})).status, 200);
  const remaining = await (await post('/auth/device/code', {client_id: COFFEE_IOS_CLIENT})).json();
  await fetch(base + '/auth/device?user_code=' + encodeURIComponent(remaining.user_code), {headers: browserHeaders(browser)});
  assert.equal(db.prepare('SELECT count(*) AS n FROM deviceCode WHERE userId=?').get(owner.id).n, 1);
  const nativeForDeletion = await helpers.login({userId: owner.id});
  const deletionHeaders = {Authorization: 'Bearer ' + nativeForDeletion.session.token, 'X-Coffee-Account': owner.id};
  assert.equal((await post('/auth/delete-user', {}, {...deletionHeaders, 'X-Coffee-Account': otherUser.id})).status, 409);
  assert.equal((await post('/auth/delete-user', {}, {...deletionHeaders, Origin: origin})).status, 403);
  assert.equal((await post('/auth/delete-user', {}, deletionHeaders)).status, 200);
  assert.equal(db.prepare('SELECT count(*) AS n FROM deviceCode WHERE userId=?').get(owner.id).n, 0);
  assert.equal((await fetch(base + '/recipes', {headers: browserHeaders(browser)})).status, 401);
  assert.equal((await fetch(base + '/recipes', {headers: browserHeaders(other)})).status, 200);
});
