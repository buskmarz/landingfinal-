import type { SavedRecipe } from './domain.ts';
import { cleanRecipe } from './recipe-sync.ts';

export const RECIPE_LIBRARY_LIMIT = 500;
export const RECIPE_LIBRARY_BYTES = 2 * 1024 * 1024;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type RecipeLibrary = { revision: string | null; recipes: SavedRecipe[] };
export type RecipeLibraryWrite = RecipeLibrary & { mutationId: string };

export function parseRecipeLibrary(value: unknown): RecipeLibrary {
  if (!value || typeof value !== 'object') throw new Error('Biblioteca inválida.');
  const { revision, recipes } = value as Record<string, unknown>;
  if (revision !== null && (typeof revision !== 'string' || !uuid.test(revision))) {
    throw new Error('Versión de biblioteca inválida.');
  }
  if (!Array.isArray(recipes) || recipes.length > RECIPE_LIBRARY_LIMIT) {
    throw new Error('La biblioteca admite hasta 500 recetas.');
  }
  const cleaned = recipes.map(cleanRecipe);
  if (new Set(cleaned.map(recipe => recipe.id)).size !== cleaned.length) {
    throw new Error('Hay identificadores de receta repetidos.');
  }
  cleaned.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return { revision, recipes: cleaned };
}

export function parseRecipeLibraryWrite(value: unknown): RecipeLibraryWrite {
  const library = parseRecipeLibrary(value);
  const mutationId = (value as Record<string, unknown>).mutationId;
  if (typeof mutationId !== 'string' || !uuid.test(mutationId)) {
    throw new Error('Identificador de cambio inválido.');
  }
  return { ...library, mutationId };
}
