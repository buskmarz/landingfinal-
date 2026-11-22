import type { SavedRecipe } from './domain.ts';
import { parseRecipeLibrary, RECIPE_LIBRARY_BYTES, type RecipeLibrary, type RecipeLibraryWrite } from './recipe-library.ts';
import { recipeDigest } from './recipe-sync.ts';
import { recipeFile } from './transfer.ts';

export type RecipeLink = { remoteId: string; localId: string; digest: string | null };
type RecipeChange = { id: string; before: SavedRecipe | null; after: SavedRecipe | null };
export type LibraryPlan = {
  write: RecipeLibraryWrite;
  links: RecipeLink[];
  changes: RecipeChange[];
  conflicts: number;
  needsWrite: boolean;
};
export type RecipeLibrarySync = { owner: string; links: RecipeLink[]; pending?: LibraryPlan };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export async function enrollRecipes(profile: RecipeLibrarySync, selected: SavedRecipe[], library: RecipeLibrary) {
  const links = [...profile.links];
  const localIds = new Set(links.map(link => link.localId));
  const remoteIds = new Set(links.map(link => link.remoteId));
  const remote = await Promise.all(library.recipes.map(async recipe => ({
    id: recipe.id, digest: await recipeDigest(recipe),
  })));
  for (const recipe of selected) {
    if (localIds.has(recipe.id)) continue;
    const digest = await recipeDigest(recipe);
    const match = remote.find(candidate => candidate.digest === digest && !remoteIds.has(candidate.id));
    const remoteId = match?.id ?? crypto.randomUUID();
    links.push({localId: recipe.id, remoteId, digest: match ? digest : null});
    localIds.add(recipe.id);
    remoteIds.add(remoteId);
  }
  return {...profile, links};
}

async function conflictId(remoteId: string, digest: string) {
  const data = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([remoteId, digest])));
  return 'conflict-' + Array.from(new Uint8Array(data), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function planLibrarySync(recipes: SavedRecipe[], profile: RecipeLibrarySync, remote: RecipeLibrary): Promise<LibraryPlan> {
  if (remote.revision === null && profile.links.some(link => link.digest !== null)) {
    throw new Error('La biblioteca de la cuenta no está disponible. Tus recetas siguen aquí.');
  }
  const local = new Map(recipes.map(recipe => [recipe.id, recipe]));
  const linked = new Map(profile.links.map(link => [link.remoteId, link]));
  const localDigests = new Map<string, string>();
  const selected = new Map(await Promise.all(remote.recipes.map(async recipe => [
    recipe.id, {recipe, digest: await recipeDigest(recipe), bagId: null as string | null},
  ] as const)));
  let conflicts = 0;
  for (const link of profile.links) {
    const here = local.get(link.localId);
    const digest = here ? await recipeDigest(here) : null;
    if (digest) localDigests.set(link.localId, digest);
    const there = selected.get(link.remoteId)?.digest ?? null;
    if (digest === link.digest) continue;
    const next = here && digest ? {recipe: recipeFile(here).data, digest, bagId: here.config.bagId} : null;
    if (there === link.digest || there === digest) {
      if (next) selected.set(link.remoteId, next);
      else selected.delete(link.remoteId);
      continue;
    }
    conflicts++;
    // Keep a changed remote recipe, or respect its deletion, and preserve a local edit separately.
    if (next) {
      let id = await conflictId(link.remoteId, next.digest);
      while (selected.has(id) && selected.get(id)?.digest !== next.digest) {
        id = await conflictId(id, next.digest);
      }
      selected.set(id, next);
    }
  }

  const changes: RecipeChange[] = [];
  const links: RecipeLink[] = [];
  const used = new Set(local.keys());
  const chosen: SavedRecipe[] = [];
  const linkedLocalIds = new Set(profile.links.map(link => link.localId));
  const localOnlyDigests = new Set(selected.size && [...selected.keys()].some(id => !linked.has(id))
    ? await Promise.all(recipes.filter(recipe => !linkedLocalIds.has(recipe.id)).map(recipeDigest))
    : []);
  for (const [remoteId, {recipe, digest, bagId}] of selected) {
    const previous = linked.get(remoteId);
    chosen.push({...recipe, id: remoteId});
    // An identical local-only recipe is already visible. Keep it private until explicitly linked.
    if (!previous && localOnlyDigests.has(digest)) continue;
    const localId = previous?.localId ?? (used.has(remoteId) ? crypto.randomUUID() : remoteId);
    used.add(localId);
    const before = local.get(localId) ?? null;
    const after = {...recipe, id: localId, config: {...recipe.config, bagId: before?.config.bagId ?? bagId}};
    if (localDigests.get(localId) !== digest) changes.push({id: localId, before, after});
    links.push({localId, remoteId, digest});
  }
  for (const link of profile.links) {
    const before = local.get(link.localId);
    if (before && !selected.has(link.remoteId)) changes.push({id: link.localId, before, after: null});
  }
  const target = parseRecipeLibrary({revision: remote.revision, recipes: chosen});
  const write = {...target, mutationId: crypto.randomUUID()};
  const needsWrite = !same(remote.recipes, target.recipes);
  if (needsWrite && new TextEncoder().encode(JSON.stringify(write)).byteLength > RECIPE_LIBRARY_BYTES) {
    throw new Error('La biblioteca es demasiado grande para sincronizarla. Tus recetas siguen aquí.');
  }
  return {
    write, links, changes, conflicts, needsWrite,
  };
}

export function applyLibraryPlan(recipes: SavedRecipe[], plan: LibraryPlan) {
  const local = new Map(recipes.map(recipe => [recipe.id, recipe]));
  const links = new Map(plan.links.map(link => [link.localId, link]));
  let conflicts = plan.conflicts;
  for (const {id, before, after} of plan.changes) {
    const current = local.get(id) ?? null;
    if (same(current, before)) {
      if (after) local.set(id, after);
      else local.delete(id);
      continue;
    }
    // A local edit made during the request is newer than the plan.
    if (same(current, after)) continue;
    conflicts++;
    const link = links.get(id);
    if (current && before) {
      const draftId = crypto.randomUUID();
      local.set(draftId, {...current, id: draftId});
      links.set(draftId, {localId: draftId, remoteId: draftId, digest: null});
    }
    if (after && link) {
      const recoveredId = current && !before ? crypto.randomUUID() : id;
      links.delete(id);
      local.set(recoveredId, {...after, id: recoveredId});
      links.set(recoveredId, {...link, localId: recoveredId});
    } else if (before) {
      local.delete(id);
    }
  }
  return {recipes: [...local.values()], links: [...links.values()], conflicts};
}
