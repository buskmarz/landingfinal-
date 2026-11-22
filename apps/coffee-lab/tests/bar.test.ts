import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyStore, defaultConfig, RECIPES } from '../lib/coffee/domain.ts';
import { startBarCup, advanceBarCup, finishBarCup } from '../lib/coffee/bar.ts';
import { backupFile, parseImport, planImport } from '../lib/coffee/transfer.ts';

test('two bar cups advance independently and one save preserves the other and the main brew',()=>{
 const config=defaultConfig(RECIPES[0]);
 const state=startBarCup(startBarCup(emptyStore(),0,config,1000,'a'),1,config,2000,'b');
 const main={...state.bar![1]!,id:'main'};
 let current={...state,active:main};
 for(let i=0;i<config.recipe.steps.length;i++)current=advanceBarCup(current,0,'a',i,3000+i*1000) as typeof current;
 const saved=finishBarCup(current,0,'a',5);
 assert.equal(saved.active,main);
 assert.deepEqual(saved.bar,[null,state.bar![1]]);
 assert.equal(saved.brews[0].evaluation.rating,5);
 assert.equal(saved.brews[0].config.bagId,null);
 assert.equal(finishBarCup(saved,0,'a',5).brews.length,1);
});
test('a backup with bar cups is valid without restoring active timers over this device',()=>{
 const running=startBarCup(emptyStore(),0,defaultConfig(RECIPES[0]),1000,'a');
 const payload=parseImport(JSON.stringify(backupFile(running)));
 const plan=planImport(emptyStore(),payload);
 assert.equal(plan.ignoredActive,true);
 assert.equal(plan.next.bar,undefined);
});
