import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import Database from 'better-sqlite3';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { testUtils } from 'better-auth/plugins';
import { createAccountServer } from '../server/account-server.mjs';
import { defaultConfig, emptyStore, RECIPES } from '../lib/coffee/domain.ts';
import { backupFile } from '../lib/coffee/transfer.ts';
import { applyLibraryPlan, enrollRecipes, planLibrarySync } from '../lib/coffee/recipe-library-merge.ts';
import { syncRecipeLibrary } from '../lib/coffee/recipe-library-run.ts';
import { recipeDigest } from '../lib/coffee/recipe-sync.ts';
import { parseRecipeLibrary } from '../lib/coffee/recipe-library.ts';

test('local changes during a pull survive, and a missing server library does not erase a recipe', async () => {
  const local = {id: 'local', title: 'V60 inicial', config: defaultConfig(RECIPES[0]), createdAt: 1};
  const profile = {owner: 'test-owner', links: [{localId: local.id, remoteId: 'remote', digest: await recipeDigest(local)}]};
  const remote = parseRecipeLibrary({
    revision: crypto.randomUUID(), recipes: [{...local, id: 'remote', title: 'Cambió en la cuenta'}],
  });
  const plan = await planLibrarySync([local], profile, remote);
  assert.equal(plan.needsWrite, false);
  const applied = applyLibraryPlan([{...local, title: 'Cambió mientras descargaba'}], plan);
  assert.deepEqual(new Set(applied.recipes.map(recipe => recipe.title)),
    new Set(['Cambió en la cuenta', 'Cambió mientras descargaba']));
  assert.equal(applied.links.filter(link => link.digest === null).length, 1);
  await assert.rejects(planLibrarySync([local], profile, {revision: null, recipes: []}), /siguen aquí/);
  const alreadyHere = await planLibrarySync([local], {owner: 'other-owner', links: []},
    {revision: remote.revision, recipes: [{...local, id: 'remote'}]});
  assert.deepEqual(alreadyHere.links, []);
  assert.deepEqual(alreadyHere.changes, []);
});

function localStore() {
  let state = emptyStore();
  return {
    read: async () => structuredClone(state),
    update: async change => {
      state = change(structuredClone(state));
      return structuredClone(state);
    },
  };
}

test('two devices sync their selected recipes, reconcile edits and retry a committed change once', async t => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  const origin = 'http://127.0.0.1:5198';
  const options = {
    baseURL: origin, basePath: '/coffee-lab/api/auth', database: db,
    secret: 'isolated-recipe-library-test-secret', plugins: [testUtils()],
  };
  await (await getMigrations(options)).runMigrations();
  const auth = betterAuth(options);
  const helper = (await auth.$context).test;
  const owner = await helper.saveUser(helper.createUser({email: 'library@example.test'}));
  const other = await helper.saveUser(helper.createUser({email: 'different@example.test'}));
  const mac = await helper.login({userId: owner.id});
  const phone = await helper.login({userId: owner.id});
  const separate = await helper.login({userId: other.id});
  const server = createAccountServer({auth, db, origin, providers: []});
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    db.close();
  });
  const endpoint = 'http://127.0.0.1:' + server.address().port + '/coffee-lab/api/';
  const request = session => async (path, body, account) => {
    const headers = new Headers(session.headers);
    headers.set('X-Coffee-Account', account);
    if (body) {
      headers.set('Origin', origin);
      headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(endpoint + path, {
      headers, method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined,
    });
    const value = await response.json();
    if (!response.ok) throw Object.assign(new Error(value.error), {status: response.status, code: value.code});
    return value;
  };
  const a = localStore(), b = localStore();
  const sendA = request(mac), sendB = request(phone);
  const read = send => send('recipe-library', undefined, owner.id);
  const base = {id: 'local-v60', title: 'V60 inicial', config: {...defaultConfig(RECIPES[0]), bagId: 'private-bag'}, createdAt: 1};
  const privateRecipe = {...base, id: 'private', title: 'Solo aquí'};
  const profile = await enrollRecipes({owner: owner.id, links: []}, [base], await read(sendA));
  await a.update(state => ({...state, recipes: [base, privateRecipe], recipeLibrarySync: profile}));
  await b.update(state => ({...state, recipeLibrarySync: {owner: owner.id, links: []}}));
  await syncRecipeLibrary(a, sendA, owner.id);
  await syncRecipeLibrary(b, sendB, owner.id);
  assert.deepEqual((await b.read()).recipes.map(recipe => recipe.title), [base.title]);
  assert.equal((await b.read()).recipes[0].config.bagId, null);
  assert.equal((await a.read()).recipes[0].config.bagId, 'private-bag');
  assert.ok(!Object.hasOwn(backupFile(await a.read()).data, 'recipeLibrarySync'));
  await assert.rejects(read(request(separate)), {status: 409});
  assert.deepEqual(await request(separate)('recipe-library', undefined, other.id), {revision: null, recipes: []});

  const edit = (repository, title) => repository.update(state => ({
    ...state, recipes: state.recipes.map(recipe => recipe.id === 'private' ? recipe : {...recipe, title}),
  }));
  await edit(a, 'Edición sin conexión');
  await edit(b, 'Edición iPhone');
  await syncRecipeLibrary(b, sendB, owner.id);
  let attempted;
  await assert.rejects(syncRecipeLibrary(a, async (path, body, id) => {
    const value = await sendA(path, body, id);
    if (body) {
      attempted = body;
      throw new TypeError('Disconnected after commit');
    }
    return value;
  }, owner.id), /Disconnected/);
  assert.equal((await a.read()).recipeLibrarySync.pending.write.mutationId, attempted.mutationId);
  const committed = await read(sendA);
  assert.deepEqual(new Set(committed.recipes.map(recipe => recipe.title)), new Set(['Edición sin conexión', 'Edición iPhone']));
  await syncRecipeLibrary(b, sendB, owner.id);
  await b.update(state => ({...state, recipes: state.recipes.filter(recipe => recipe.title !== 'Edición sin conexión')}));
  await syncRecipeLibrary(b, sendB, owner.id);
  await syncRecipeLibrary(a, sendA, owner.id);
  await syncRecipeLibrary(a, sendA, owner.id);
  assert.deepEqual((await read(sendA)).recipes.map(recipe => recipe.title), ['Edición iPhone']);
  assert.deepEqual((await a.read()).recipes.map(recipe => recipe.title), ['Edición iPhone', 'Solo aquí']);
  assert.ok(!(await a.read()).recipeLibrarySync.pending);

  const current = await read(sendA);
  await assert.rejects(sendA('recipe-library', {...attempted, recipes: []}, owner.id), {code: 'MUTATION_REUSED'});
  await assert.rejects(sendA('recipe-library', {...committed, mutationId: crypto.randomUUID()}, owner.id), {code: 'LIBRARY_CHANGED'});
  assert.deepEqual(await read(sendA), current);
  assert.deepEqual(await sendA('recipes', undefined, owner.id), {recipes: []});
  await auth.api.signOut({headers: phone.headers});
  await assert.rejects(read(sendB), {status: 401});
  db.prepare('DELETE FROM user WHERE id=?').run(owner.id);
  assert.equal(db.prepare('SELECT count(*) AS count FROM coffee_recipe_library').get().count, 0);
  assert.equal(db.prepare('SELECT count(*) AS count FROM coffee_recipe_library_receipts').get().count, 0);
});
