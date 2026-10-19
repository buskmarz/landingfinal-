// Exhausts only the disposable local QA fixture, never production.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base='http://127.0.0.1:5196',fixture=JSON.parse(await fs.readFile('output/freak-review/local-fixture.json','utf8'));
async function call(op,body,cookie=''){
 const r=await fetch(base+'/api/freak?op='+op,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:base}:{}),Cookie:cookie,'x-qa-ip':'exhaustion-local-only'},body:body?JSON.stringify(body):undefined});return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
const admin=await call('admin-login',{key:fixture.admin});assert.equal(admin.status,200);
const free=(await call('rewards')).data.prizes.filter(p=>!p.taken);
for(let i=0;i<free.length;i++){
 const phone='221000000'+i,name='Prueba Agotado '+['Alfa','Beta','Gamma','Delta','Epsilon'][i];
 const reg=await call('register',{name,phone,recovery:phone.slice(-4)});assert.equal(reg.status,200);
 const valid=await call('admin-validate-points',{name,phone,normal:10,special:0,marked:true},admin.cookie);assert.equal(valid.status,200);
 const won=await call('reward-claim',{id:free[i].id,poster:fixture.poster,code:valid.data.code},reg.cookie);assert.equal(won.status,200);
}
const state=(await call('rewards')).data;assert.equal(state.prizes.length,5);assert.equal(state.prizes.filter(p=>!p.taken).length,0);
await fs.writeFile('output/freak-review/exhaustion-local.json',JSON.stringify({localOnly:true,prizes:5,available:0,realCustomersAffected:0},null,2));console.log('PASS local fixture: five prizes taken, zero available.');
