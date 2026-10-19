// Uses the isolated local QA server only. No production data or real prizes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base='http://127.0.0.1:5196',fixture=JSON.parse(await fs.readFile('output/freak-review/local-fixture.json','utf8'));
const phone='2220000066',name='Prueba Recarga';
async function call(op,body,cookie=''){
 const r=await fetch(base+'/api/freak?op='+op,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:base}:{}),Cookie:cookie,'x-qa-ip':'integration-reload'},body:body?JSON.stringify(body):undefined});return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
const reg=await call('register',{name,phone,recovery:phone.slice(-4)});assert.equal(reg.status,200,'Run against a fresh local QA database.');const cookie=reg.cookie;
const login=await call('admin-login',{key:fixture.admin});assert.equal(login.status,200);
const validation=await call('admin-validate-points',{name,phone,normal:8,special:1,marked:true},login.cookie);assert.equal(validation.status,200);
const claim={id:'4',poster:fixture.poster,code:validation.data.code};assert.equal((await call('reward-claim',claim,cookie)).status,200);
assert.equal((await call('reward-claim',claim,cookie)).status,200,'Lost-response retry is idempotent');
for(let i=0;i<2;i++){const state=await call('rewards',undefined,cookie);assert.equal(state.data.mine.id,'4');assert.equal(state.data.prizes.filter(p=>p.taken).length,1);}
assert.equal((await call('reward-claim',{...claim,id:'1'},cookie)).status,409);
const result={localOnly:true,checks:['confirmed prize persists across independent reads','same claim retry returns same prize','only one prize taken','second prize per account rejected']};
await fs.writeFile('output/freak-review/integration-reload.json',JSON.stringify(result,null,2));console.log('PASS 4 local integration checks: reload, retry, one taken, second blocked.');
