import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB, IDBObjectStore } from 'fake-indexeddb';
import { readStore, updateStore } from '../lib/coffee/storage.ts';
import { createCupping } from '../lib/coffee/cupping.ts';
import { parseImport } from '../lib/coffee/transfer.ts';
import { createDraftWriter } from '../lib/coffee/draft-writer.ts';
Object.defineProperty(globalThis,'indexedDB',{value:indexedDB});

test('storage abort keeps the last persisted tasting and permits a later retry',async()=>{
 const activeCupping=createCupping({protocol:'practice',volume:200,cupsPerSample:1,blind:false,names:['QA aislamiento']});
 activeCupping.cups[0].fragrance='cacao guardado';
 await updateStore(s=>({...s,activeCupping}));
 const baseline=await readStore();const originalPut=IDBObjectStore.prototype.put;
 IDBObjectStore.prototype.put=function(){throw new DOMException('Simulated full storage','QuotaExceededError')};
 try{await assert.rejects(updateStore(s=>({...s,activeCupping:{...s.activeCupping!,cups:s.activeCupping!.cups.map(c=>({...c,fragrance:'nota pendiente'}))}})));}
 finally{IDBObjectStore.prototype.put=originalPut;}
 assert.deepEqual(await readStore(),baseline);
 assert.throws(()=>parseImport('{archivo inválido'));assert.deepEqual(await readStore(),baseline);
 await updateStore(s=>({...s,activeCupping:{...s.activeCupping!,cups:s.activeCupping!.cups.map(c=>({...c,fragrance:'nota recuperada'}))}}));
 assert.equal((await readStore()).activeCupping?.cups[0].fragrance,'nota recuperada');
});
test('note writer serializes rapid edits so a slow older write cannot replace the latest note',async()=>{
 const writes:string[]=[];const states:string[]=[];let release!:()=>void;
 const writer=createDraftWriter<string>(async value=>{writes.push(value);if(writes.length===1)await new Promise<void>(r=>{release=r})},s=>states.push(s));
 const saving=writer.set('c');void writer.set('ca');void writer.set('cacao');release();await saving;
 assert.deepEqual(writes,['c','cacao']);assert.deepEqual(states,['saving','saved']);
});
test('failed note retains its newest draft and only reports saved after retry succeeds',async()=>{
 const writes:string[]=[];const states:string[]=[];let failing=true;
 const writer=createDraftWriter<string>(async value=>{writes.push(value);if(failing)throw new Error('quota')},s=>states.push(s));
 await writer.set('cacao y cítrico');assert.deepEqual(states,['saving','failed']);
 failing=false;await writer.retry();assert.deepEqual(writes,['cacao y cítrico','cacao y cítrico']);assert.equal(states.at(-1),'saved');
 await writer.retry();assert.equal(writes.length,2);
});
