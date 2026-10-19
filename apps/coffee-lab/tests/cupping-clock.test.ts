import test from 'node:test';
import assert from 'node:assert/strict';
import { clockDiverged } from '../lib/coffee/cupping-clock.ts';
import { advanceCup,createCupping,breakWindow,cupElapsed,cuppingSchema } from '../lib/coffee/cupping.ts';
import { backupFile,parseImport } from '../lib/coffee/transfer.ts';
import { emptyStore } from '../lib/coffee/domain.ts';
function twoCups(){let s=createCupping({protocol:'practice',volume:200,cupsPerSample:1,blind:true,names:['Lavado QA','Natural QA']},1000);for(const c of s.cups)s=advanceCup(s,c.id,2000);s=advanceCup(s,s.cups[0].id,3000);s=advanceCup(s,s.cups[1].id,33000);return s;}
test('hidden-page time advances by timestamps without advancing any cup stage',()=>{
 const s=twoCups();s.cups[0].fragrance='cítrico';const copy=JSON.stringify(s);const restored=cuppingSchema.parse(JSON.parse(copy));
 assert.deepEqual(restored.cups.map(c=>cupElapsed(c,303000)),[300,270]);assert.deepEqual(restored.cups.map(c=>breakWindow(c,363000)),['late','late']);assert.deepEqual(restored.cups.map(c=>c.phase),[2,2]);assert.equal(JSON.stringify(s),copy);assert.equal(restored.blind,true);assert.equal(restored.cups[0].fragrance,'cítrico');
});
test('clock comparison accepts normal suspended callbacks but detects forward and backward clock edits',()=>{
 const anchor={wall:1000000,monotonic:100};assert.equal(clockDiverged(anchor,1600000,600100),false);
 assert.equal(clockDiverged(anchor,4600000,200),true);assert.equal(clockDiverged(anchor,1000,200),true);assert.equal(clockDiverged(anchor,NaN,200),true);assert.equal(clockDiverged(anchor,1000100,0),true);
});
test('clock warning survives backup parsing and blocks a premature break until acknowledged',()=>{
 const s={...twoCups(),clockNeedsCheck:true};const parsed=parseImport(JSON.stringify(backupFile({...emptyStore(),activeCupping:s})));assert.equal(parsed.kind,'backup');if(parsed.kind==='backup')assert.equal(parsed.data.activeCupping?.clockNeedsCheck,true);
 assert.throws(()=>advanceCup(s,s.cups[0].id,999999),/hora/);assert.equal(advanceCup({...s,clockNeedsCheck:false},s.cups[0].id,183000).cups[0].phase,3);
});
test('a backward clock cannot timestamp an action before the previously saved action',()=>{
 let s=twoCups();s=advanceCup(s,s.cups[0].id,183000);s=advanceCup(s,s.cups[1].id,213000);
 assert.throws(()=>advanceCup(s,s.cups[0].id,200000),/hora/);assert.equal(s.cups[0].phase,3);
});
test('repeated action from an outdated screen does not skip a step or alter its timestamps',()=>{
 const s=twoCups();const first=advanceCup(s,s.cups[0].id,183000,2);const second=advanceCup(first,s.cups[0].id,184000,2);assert.deepEqual(second,first);assert.equal(second.cups[0].phase,3);
});
