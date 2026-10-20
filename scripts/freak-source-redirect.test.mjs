import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';
const code='//'+(await fs.readFile(new URL('../freak/physical.js',import.meta.url),'utf8')).split('// Source labels are explicit in new print links.')[1];
for(const [name,isQrPage,poster,search,expected] of [['ticket',false,'','?origen=boleto','boleto'],['advert',false,'','?origen=anuncio','anuncio'],['general',false,'','','general'],['legacy prize redirect',false,'private-token','',null],['prize page',true,'private-token','',null]]){
 test('source tracking '+name,async()=>{const events=[];vm.runInNewContext(code,{isQrPage,poster,location:{search},URLSearchParams,crypto:{randomUUID:()=> 'local-uuid'},localStorage:{getItem:()=>null,setItem(){}},api:async(op,body)=>events.push({op,...body}),setTimeout(){}});await Promise.resolve();assert.equal(events.length,expected?1:0);if(expected)assert.equal(events[0].source,expected);});
}
