import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyStore, defaultConfig, RECIPES } from '../lib/coffee/domain.ts';
import { planRecipeSync, recipeDigest } from '../lib/coffee/recipe-sync.ts';
const original={id:'r1',title:'Mi V60',config:{...defaultConfig(RECIPES[0]),bagId:'private-bag'},createdAt:123};
test('sync strips private bag reference and keeps existing history/preferences',async()=>{
 const store=emptyStore();const before=structuredClone(store);const result=await planRecipeSync(store,[original]);assert.equal(result.recipes[0].config.bagId,null);assert.deepEqual(store,before);assert.equal(result.added,1);
});
test('conflicting edits survive and repeated sync is idempotent',async()=>{
 const store={...emptyStore(),recipes:[original]};const other={...original,title:'Otra versión'};
 const first=await planRecipeSync(store,[other]);assert.equal(first.conflicts,1);assert.equal(first.recipes.length,2);assert.equal(first.recipes[0].title,'Mi V60');
 const repeat=await planRecipeSync({...store,recipes:first.recipes},[other]);assert.equal(repeat.added,0);assert.equal(repeat.recipes.length,2);
});
test('invalid incoming batch does not mutate local data',async()=>{
 const store={...emptyStore(),recipes:[original]},before=structuredClone(store);await assert.rejects(planRecipeSync(store,[original,{id:'broken'}]));assert.deepEqual(store,before);
});
test('content digest ignores bag and local ID, retains actual recipe changes',async()=>{
 assert.equal(await recipeDigest(original),await recipeDigest({...original,id:'other',config:{...original.config,bagId:null}}));
 assert.notEqual(await recipeDigest(original),await recipeDigest({...original,title:'Changed'}));
});
