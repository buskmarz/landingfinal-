import {test,before,after} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {randomBytes,createHash} from 'node:crypto';import {NetlifyDB} from '@netlify/database-dev';import {getDatabase} from '@netlify/database';import {createHandler} from '../netlify/functions/freak.mjs';
let engine,db,handler;const cookies={};
async function req(op,body,who=''){const r=await handler(new Request('https://bmoodcoffee.com/api/freak?camp=prueba&op='+op,{method:body?'POST':'GET',headers:{origin:'https://bmoodcoffee.com','content-type':'application/json',cookie:cookies[who]||''},body:body?JSON.stringify(body):undefined}),{ip:who+op});if(r.headers.get('set-cookie'))cookies[who]=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};}
before(async()=>{engine=new NetlifyDB();db=getDatabase({connectionString:await engine.start()});for(const f of (await fs.readdir('netlify/database/migrations')).filter(f=>f.includes('freak')&&!f.includes('inventory')).sort())await db.pool.query(await fs.readFile('netlify/database/migrations/'+f,'utf8'));handler=createHandler(db);const key=randomBytes(32).toString('base64url');await db.pool.query("UPDATE freak_admins SET key_hash=$1 WHERE id='owner'",[createHash('sha256').update(key).digest('hex')]);assert.equal((await req('admin-login',{key},'admin')).status,200);});
after(async()=>{await db.pool.end();await engine.stop();});
test('secret PIN has a real hash and phone suffix cannot authenticate',async()=>{
 const data={name:'Persona PIN',phone:'2220000999',recovery:'671938'};
 assert.equal((await req('register',{...data,recovery:'0999'},'user')).status,400);
 const r=await req('register',data,'user');assert.equal(r.status,200);assert.equal(r.recovery,undefined);
 assert.equal((await req('login',{phone:data.phone,recovery:'0999'},'bad')).status,401);
 assert.equal((await req('login',{phone:data.phone,recovery:'671939'},'bad')).status,401);
 assert.equal((await req('login',{phone:data.phone,recovery:data.recovery},'return')).status,200);
});
test('admin verified reset revokes old sessions, preserves identity, audits without PIN',async()=>{
 const body={name:'Persona PIN',phone:'2220000999',confirmed:true};
 assert.equal((await req('admin-reset-pin',body,'user')).status,401);
 assert.equal((await req('admin-reset-pin',{...body,confirmed:false},'admin')).status,400);
 assert.equal((await req('admin-reset-pin',{...body,name:'Otra persona'},'admin')).status,404);
 const old=(await req('state',undefined,'user')).person;
 const reset=await req('admin-reset-pin',body,'admin');assert.equal(reset.status,200);assert.match(reset.pin,/^\d{8}$/);
 assert.equal((await req('state',undefined,'user')).person,null);
 assert.equal((await req('login',{phone:body.phone,recovery:'671938'},'old')).status,401);
 const login=await req('login',{phone:body.phone,recovery:reset.pin},'new');assert.equal(login.status,200);assert.equal(login.person.id,old.id);
 const audit=(await db.pool.query('SELECT * FROM freak_pin_resets')).rows;assert.equal(audit.length,1);assert.ok(!JSON.stringify(audit).includes(reset.pin));
});

test('name and phone registration needs no visible secret; browser session persists without phone-only takeover',async()=>{
 const body={name:'Registro sin PIN',phone:'2220000888'};
 const created=await req('register',body,'no-pin');assert.equal(created.status,200);assert.equal(created.recovery,undefined);
 assert.equal((await req('state',undefined,'no-pin')).person.id,created.person.id);
 assert.equal((await req('login',{phone:body.phone,recovery:'0888'},'imposter')).status,401);
 assert.equal((await req('register',body,'imposter')).status,409);
 assert.equal((await req('state',undefined,'imposter')).person,null);
 const row=(await db.pool.query('SELECT recovery_length,recovery_hash FROM freak_people WHERE id=$1',[created.person.id])).rows[0];assert.equal(row.recovery_length,64);assert.equal(row.recovery_hash.length,128);
});
