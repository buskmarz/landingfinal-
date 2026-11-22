import type { Store } from './domain.ts';
import { parseRecipeLibrary } from './recipe-library.ts';
import { applyLibraryPlan, planLibrarySync, type LibraryPlan } from './recipe-library-merge.ts';

type LibraryRepository = {
  read(): Promise<Store>;
  update(change: (current: Store) => Store): Promise<Store>;
};
type LibraryRequest = (path: string, body: unknown, owner: string) => Promise<unknown>;
class LocalRecipesChanged extends Error {}

function finish(current: Store, owner: string, plan: LibraryPlan) {
  const {recipes, links, conflicts} = applyLibraryPlan(current.recipes || [], plan);
  return {state: {...current, recipes, recipeLibrarySync: {owner, links}}, conflicts};
}

export async function syncRecipeLibrary(repository: LibraryRepository, request: LibraryRequest, owner: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const snapshot = await repository.read();
    const profile = snapshot.recipeLibrarySync;
    if (profile?.owner !== owner) return null;
    const pending = profile.pending;
    if (pending) {
      try {
        const receipt = await request('recipe-library', pending.write, owner);
        parseRecipeLibrary({...receipt as object, recipes: []});
      } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'LIBRARY_CHANGED')) throw error;
        // A rejected CAS was never committed. Retry against the current library.
        await repository.update(current =>
          current.recipeLibrarySync?.pending?.write.mutationId === pending.write.mutationId
            ? {...current, recipeLibrarySync: {owner, links: profile.links}}
            : current);
        continue;
      }
      let conflicts = 0;
      const state = await repository.update(current => {
        if (current.recipeLibrarySync?.pending?.write.mutationId !== pending.write.mutationId) return current;
        const result = finish(current, owner, pending);
        conflicts = result.conflicts;
        return result.state;
      });
      return {state, conflicts};
    }
    const remote = parseRecipeLibrary(await request('recipe-library', undefined, owner));
    const plan = await planLibrarySync(snapshot.recipes || [], profile, remote);
    const originalLinks = JSON.stringify(profile.links);
    if (!plan.needsWrite && !plan.changes.length && JSON.stringify(plan.links) === originalLinks) {
      return {state: null, conflicts: plan.conflicts};
    }
    try {
      const state = await repository.update(current => {
        const active = current.recipeLibrarySync;
        if (active?.owner !== owner || active.pending || JSON.stringify(active.links) !== originalLinks ||
            JSON.stringify(current.recipes || []) !== JSON.stringify(snapshot.recipes || [])) {
          throw new LocalRecipesChanged();
        }
        return plan.needsWrite
          ? {...current, recipeLibrarySync: {...active, pending: plan}}
          : finish(current, owner, plan).state;
      });
      if (!plan.needsWrite) return {state, conflicts: plan.conflicts};
    } catch (error) {
      if (!(error instanceof LocalRecipesChanged)) throw error;
    }
  }
  throw new Error('Cambios pendientes. Se reintentará la sincronización.');
}
