import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
function worker(){
 const handlers:Record<string,Function>={};const cache=new Map<string,Response>();let online=true;
 const key=(r:any)=>typeof r==='string'?r:r.url;
 const fakeCache={addAll:async(urls:string[])=>{urls.forEach(u=>cache.set(u,new Response(u==='/coffee-lab/'?'<html>Better Mood</html>':'asset')))},match:async(r:any)=>cache.get(key(r))?.clone(),put:async(r:any,res:Response)=>{cache.set(key(r),res)}};
 const context={URL,Promise,self:{location:{origin:'https://lab.test'},addEventListener:(name:string,fn:Function)=>handlers[name]=fn,clients:{claim:async()=>{}}},caches:{open:async()=>fakeCache,match:fakeCache.match,keys:async()=>['ritual-shell-v2','ritual-shell-v3'],delete:async()=>true},fetch:async()=>{if(!online)throw new Error('offline');return new Response('downloaded asset')}};
 vm.runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),context);
 return {handlers,cache,offline:()=>online=false};
}
test('offline navigation returns the installed shell after network loss',async()=>{const w=worker();let install!:Promise<unknown>;w.handlers.install({waitUntil:(p:Promise<unknown>)=>install=p});await install;w.offline();let response!:Promise<Response>;w.handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://lab.test/coffee-lab/'},respondWith:(p:Promise<Response>)=>response=p});assert.match(await (await response).text(),/Better Mood/)});
test('branding fonts are installed and available without network',async()=>{const w=worker();let install!:Promise<unknown>;w.handlers.install({waitUntil:(p:Promise<unknown>)=>install=p});await install;assert.ok(w.cache.has('/coffee-lab/brand/Metropolis-Regular.woff'));assert.ok(w.cache.has('/coffee-lab/brand/better-mood.png'))});
test('API requests bypass offline shell, avoiding false success for data writes',()=>{const w=worker();let intercepted=false;w.handlers.fetch({request:{method:'GET',mode:'cors',url:'https://lab.test/api/example'},respondWith:()=>intercepted=true});assert.equal(intercepted,false)});

test('landing, menu and root API are outside service worker control',()=>{const w=worker();for(const path of ['/', '/menu/', '/api/table-order', '/assets/site.js', '/coffee-lab/api/test']){let intercepted=false;w.handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://lab.test'+path},respondWith:()=>intercepted=true});assert.equal(intercepted,false,path)}});
