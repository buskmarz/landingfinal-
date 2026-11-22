import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import Database from 'better-sqlite3';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { testUtils } from 'better-auth/plugins';
import { createAccountServer } from '../server/account-server.mjs';
import { requireConfirmedAccount, revokeAppleBeforeDeletion } from '../server/account-deletion.mjs';
import { defaultConfig, emptyStore, RECIPES } from '../lib/coffee/domain.ts';
import { planRecipeSync } from '../lib/coffee/recipe-sync.ts';

test('authenticated recipe copies travel between sessions without crossing accounts', async t => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  const origin = 'http://127.0.0.1:5198';
  const options = {
    baseURL: origin,
    basePath: '/coffee-lab/api/auth',
    database: db,
    secret: 'isolated-test-secret-coffee-lab-sync',
    plugins: [testUtils()],
  };
  await (await getMigrations(options)).runMigrations();
  const auth = betterAuth(options);
  const helpers = (await auth.$context).test;
  const alice = await helpers.saveUser(helpers.createUser({email: 'alice@example.test'}));
  const bob = await helpers.saveUser(helpers.createUser({email: 'bob@example.test'}));
  const [mac, phone, other] = await Promise.all(
    [alice.id, alice.id, bob.id].map(userId => helpers.login({userId}))
  );
  const server = createAccountServer({auth, db, origin, providers: []});
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    db.close();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/coffee-lab/api/recipes`;
  function request(session, owner, recipes, from = origin) {
    const headers = new Headers(session?.headers);
    if (owner) headers.set('X-Coffee-Account', owner);
    if (recipes === undefined) return fetch(url, {headers});
    headers.set('Origin', from);
    headers.set('Content-Type', 'application/json');
    return fetch(url, {headers, method: 'POST', body: JSON.stringify({recipes})});
  }
  const original = {
    id: 'v60-1',
    title: 'V60 de prueba',
    createdAt: 123,
    config: {...defaultConfig(RECIPES[0]), bagId: 'bolsa-local'}
  };
  assert.equal((await request(null, alice.id)).status, 401);
  assert.equal((await request(other, alice.id, [original])).status, 409);
  assert.equal((await request(mac, alice.id, [original], 'https://elsewhere.example')).status, 403);
  assert.equal((await request(mac, alice.id, [original, {id: 'invalid'}])).status, 400);
  assert.deepEqual(await (await request(phone, alice.id)).json(), {recipes: []});

  const copy = await request(mac, alice.id, [original]);
  assert.equal(copy.status, 200);
  const first = (await copy.json()).recipes;
  assert.equal(first.length, 1);
  assert.equal(first[0].config.bagId, null);
  assert.deepEqual(await (await request(other, bob.id)).json(), {recipes: []});

  const phoneData = await (await request(phone, alice.id)).json();
  const restored = await planRecipeSync(emptyStore(), phoneData.recipes);
  assert.equal(restored.added, 1);
  const edited = {...restored.recipes[0], title: 'Ajuste desde iPhone'};
  await Promise.all([
    request(phone, alice.id, [edited]),
    request(mac, alice.id, [original, edited])
  ]).then(results => results.forEach(response => assert.equal(response.status, 200)));
  const latest = await (await request(mac, alice.id)).json();
  const merged = await planRecipeSync({...emptyStore(), recipes: [original]}, latest.recipes);
  assert.equal(merged.conflicts, 1);
  assert.equal(merged.recipes.length, 2);
  assert.deepEqual(new Set(merged.recipes.map(recipe => recipe.title)), new Set([original.title, edited.title]));

  await auth.api.signOut({headers: phone.headers});
  assert.equal((await request(phone, alice.id)).status, 401);
  assert.equal((await request(mac, alice.id)).status, 200);
});

test('account deletion binds the confirmation, revokes Apple first, and removes only that account and its copies', async t => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  const origin = 'http://127.0.0.1:5198';
  let appleAvailable = false;
  const revocations = [];
  const beforeDelete = revokeAppleBeforeDeletion(db, {clientId: 'test-client', clientSecret: 'test-secret'}, async (url, request) => {
    revocations.push({url, method: request.method, body: Object.fromEntries(request.body)});
    return new Response(null, {status: appleAvailable ? 200 : 503});
  });
  const options = {
    baseURL: origin, basePath: '/coffee-lab/api/auth', database: db,
    secret: 'isolated-test-secret-coffee-lab-delete',
    plugins: [testUtils()],
    hooks: {before: requireConfirmedAccount(origin)},
    user: {deleteUser: {enabled: true, beforeDelete}},
  };
  await (await getMigrations(options)).runMigrations();
  const auth = betterAuth(options);
  const helpers = (await auth.$context).test;
  const alice = await helpers.saveUser(helpers.createUser({email: 'delete-alice@example.test'}));
  const bob = await helpers.saveUser(helpers.createUser({email: 'keep-bob@example.test'}));
  const server = createAccountServer({auth, db, origin, providers: []});
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    db.close();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/coffee-lab/api`;
  const [mac, phone, other] = await Promise.all([alice.id, alice.id, bob.id].map(userId => helpers.login({userId})));
  db.prepare(`INSERT INTO account (id, accountId, providerId, userId, refreshToken, createdAt, updatedAt)
    VALUES (?, ?, 'apple', ?, ?, ?, ?)`).run('fake-apple-account', 'fake-apple-sub', alice.id, 'fake-refresh-token', Date.now(), Date.now());
  function post(path, session, account, body, from = origin) {
    const headers = new Headers(session?.headers);
    if (account) headers.set('X-Coffee-Account', account);
    headers.set('Origin', from);
    headers.set('Content-Type', 'application/json');
    return fetch(base + path, {headers, method: 'POST', body: JSON.stringify(body)});
  }
  const recipe = {id: 'deletion-v60', title: 'V60 para probar borrado', createdAt: 1, config: defaultConfig(RECIPES[0])};
  assert.equal((await post('/recipes', mac, alice.id, {recipes: [recipe]})).status, 200);
  assert.equal((await post('/recipes', other, bob.id, {recipes: [recipe]})).status, 200);
  const remove = (session, owner, from) => post('/auth/delete-user', session, owner, {}, from);
  assert.equal((await remove(null, alice.id)).status, 401);
  assert.equal((await remove(mac, alice.id, 'https://another.example')).status, 403);
  assert.equal((await remove(other, alice.id)).status, 409);
  assert.equal((await remove(mac)).status, 409);
  db.prepare('UPDATE session SET createdAt = ? WHERE id = ?').run(Date.now() - 2 * 86400000, phone.session.id);
  const oldSession = await remove(phone, alice.id);
  assert.equal(oldSession.status, 400);
  assert.equal((await oldSession.json()).code, 'SESSION_EXPIRED');
  assert.equal(revocations.length, 0);
  const failed = await remove(mac, alice.id);
  assert.equal(failed.status, 503);
  assert.equal(db.prepare('SELECT count(*) AS total FROM coffee_recipe_versions').get().total, 2);
  appleAvailable = true;
  const deleted = await remove(mac, alice.id);
  assert.equal(deleted.status, 200);
  assert.deepEqual(await deleted.json(), {success: true, message: 'User deleted'});
  assert.deepEqual(revocations, [0, 1].map(() => ({
    url: 'https://appleid.apple.com/auth/revoke',
    method: 'POST',
    body: {client_id: 'test-client', client_secret: 'test-secret', token: 'fake-refresh-token', token_type_hint: 'refresh_token'},
  })));
  assert.equal(db.prepare('SELECT id FROM user WHERE id=?').get(alice.id), undefined);
  assert.equal(db.prepare('SELECT id FROM account WHERE userId=?').get(alice.id), undefined);
  assert.equal(db.prepare('SELECT count(*) AS total FROM coffee_recipe_versions').get().total, 1);
  assert.equal((await post('/recipes', phone, alice.id, {recipes: []})).status, 401);
  assert.equal((await post('/recipes', other, bob.id, {recipes: []})).status, 200);
});
