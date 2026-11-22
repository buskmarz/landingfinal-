import { createHash, randomUUID } from 'node:crypto';
import { parseRecipeLibraryWrite } from '../lib/coffee/recipe-library.ts';

export function createRecipeLibrary(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS coffee_recipe_library (
    owner TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
    revision TEXT NOT NULL,
    payload TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS coffee_recipe_library_receipts (
    owner TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    mutation_id TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    revision TEXT,
    PRIMARY KEY(owner, mutation_id)
  );`);
  const read = db.prepare('SELECT revision, payload FROM coffee_recipe_library WHERE owner=?');
  const receipt = db.prepare('SELECT request_hash, revision FROM coffee_recipe_library_receipts WHERE owner=? AND mutation_id=?');
  const remember = db.prepare('INSERT INTO coffee_recipe_library_receipts VALUES (?,?,?,?)');
  const save = db.prepare(`INSERT INTO coffee_recipe_library VALUES (?,?,?)
    ON CONFLICT(owner) DO UPDATE SET revision=excluded.revision, payload=excluded.payload`);
  const snapshot = row => row
    ? {revision: row.revision, recipes: JSON.parse(row.payload)}
    : {revision: null, recipes: []};

  const write = db.transaction((owner, {revision, mutationId, recipes}) => {
    const payload = JSON.stringify(recipes);
    const hash = createHash('sha256').update(JSON.stringify([revision, payload])).digest('hex');
    const previous = receipt.get(owner, mutationId);
    if (previous) {
      if (previous.request_hash !== hash) {
        return {status: 409, data: {code: 'MUTATION_REUSED', error: 'Este cambio ya se usó.'}};
      }
      return {status: 200, data: {revision: previous.revision}};
    }
    const current = read.get(owner);
    const currentRevision = current?.revision ?? null;
    if (revision !== currentRevision) {
      return {status: 409, data: {code: 'LIBRARY_CHANGED', error: 'La biblioteca cambió. Vuelve a sincronizar.'}};
    }
    const changed = payload !== (current?.payload ?? '[]');
    const accepted = changed ? randomUUID() : currentRevision;
    if (changed) save.run(owner, accepted, payload);
    remember.run(owner, mutationId, hash, accepted);
    return {status: 200, data: {revision: accepted}};
  });

  return {
    read: owner => snapshot(read.get(owner)),
    write: (owner, value) => write.immediate(owner, parseRecipeLibraryWrite(value)),
  };
}
