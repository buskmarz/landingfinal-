import type { SavedRecipe, Store } from './domain.ts';
import { parseImport, recipeFile } from './transfer.ts';
function canonical(value: unknown): string {
 if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
 if (value && typeof value === 'object') return '{' + Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',') + '}';
 return JSON.stringify(value);
}
export function cleanRecipe(value: unknown): SavedRecipe {
 const parsed = parseImport(JSON.stringify({format:'better-mood-recipe',version:1,data:value}));
 if(parsed.kind!=='recipe') throw new Error('Receta inválida.');
 return parsed.data;
}
export async function recipeDigest(value: SavedRecipe) {
 const r=recipeFile(cleanRecipe(value)).data;
 // Content identity ignores local identifiers, but includes all preparation parameters.
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical({title:r.title,config:r.config,createdAt:r.createdAt})));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function planRecipeSync(current: Store, incoming: unknown[]) {
 if(incoming.length>10000) throw new Error('Demasiadas recetas.');
 const recipes=[...(current.recipes||[])];
 const contents=new Set(await Promise.all(recipes.map(recipeDigest)));
 let added=0,conflicts=0;
 for(const value of incoming){
  const recipe=cleanRecipe(value),digest=await recipeDigest(recipe);
  if(contents.has(digest))continue;
  if(recipes.some(r=>r.id===recipe.id)){
   // Stable content address makes repeated imports idempotent, preserving both versions.
   recipe.id='sync-'+digest; conflicts++;
   if(recipes.some(r=>r.id===recipe.id))throw new Error('Identificador en conflicto. Exporta una copia antes de continuar.');
  }
  recipes.push(recipe);contents.add(digest);added++;
 }
 return {recipes,added,conflicts};
}
