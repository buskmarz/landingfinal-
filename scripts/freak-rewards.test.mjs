import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';import {NetlifyDB} from '@netlify/database-dev';import {getDatabase} from '@netlify/database';import {createHandler} from '../netlify/functions/freak.mjs';
let engine,db,handler;const cookies={},codes={},poster=randomBytes(32).toString('base64url'),hash=s=>createHash('sha256').update(s).digest('hex');
async function req(op,body,who=''){const r=await handler(new Request('https://bmoodcoffee.com/api/freak?camp=prueba&op='+op,{method:body?'POST':'GET',headers:{origin:'https://bmoodcoffee.com','content-type':'application/json',cookie:cookies[who]||''},body:body?JSON.stringify(body):undefined}),{ip:who+op});if(r.headers.get('set-cookie'))cookies[who]=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};}
before(async()=>{engine=new NetlifyDB();db=getDatabase({connectionString:await engine.start()});for(const f of (await fs.readdir('netlify/database/migrations')).filter(f=>f.includes('freak')&&!f.includes('inventory')).sort())await db.pool.query(await fs.readFile('netlify/database/migrations/'+f,'utf8'));handler=createHandler(db);const key=randomBytes(32).toString('base64url');await db.pool.query("UPDATE freak_admins SET key_hash=$1 WHERE id='owner'",[hash(key)]);assert.equal((await req('admin-login',{key},'admin')).status,200);for(let i=0;i<3;i++){await db.pool.query('INSERT INTO freak_rewards(campaign,id,title,poster_hash) VALUES($1,$2,$3,$4)',['prueba',String(i+1),'Premio '+(i+1),i===0?hash(poster):hash(randomBytes(32).toString('hex'))]);await req('register',{name:'Persona '+String.fromCharCode(65+i),phone:'222000000'+i},'p'+i);}});
after(async()=>{await db?.pool.end();await engine?.stop();});
test('only admin can validate; minimum10 points and marking required',async()=>{const body={name:'Persona A',phone:'2220000000',normal:6,special:2,marked:true};assert.equal((await req('admin-validate-points',body,'p0')).status,401);assert.equal((await req('admin-validate-points',{...body,normal:5},'admin')).status,400);assert.equal((await req('admin-validate-points',{...body,marked:false},'admin')).status,400);for(let i=0;i<3;i++){const r=await req('admin-validate-points',{...body,name:'Persona '+String.fromCharCode(65+i),phone:'222000000'+i},'admin');assert.equal(r.status,200);assert.equal(r.points,10);codes['p'+i]=r.code;}assert.equal((await req('admin-validate-points',body,'admin')).status,409);});
test('validated points are server derived, personal and contain no redemption secret',async()=>{const own=await req('rewards',undefined,'p0');assert.deepEqual(own.validation,{points:10});const publicData=await req('rewards');assert.equal(publicData.validation,null);assert.equal(publicData.person,null);assert.ok(!JSON.stringify(own).includes(codes.p0));assert.ok(!JSON.stringify(own).includes('code_hash'));assert.ok(!JSON.stringify(publicData).includes('normal_count'));});
test('admin reissues a code, invalidates the previous one and writes hashes to audit',async()=>{
 const b={name:'Persona A',phone:'2220000000',confirmed:true};
 assert.equal((await req('admin-reissue-code',b,'p0')).status,401);
 assert.equal((await req('admin-reissue-code',{...b,confirmed:false},'admin')).status,400);
 assert.equal((await req('admin-reissue-code',{...b,phone:'2229999999'},'admin')).status,404);
 await req('register',{name:'Persona D',phone:'2220000003'},'p3');
 assert.equal((await req('admin-reissue-code',{name:'Persona D',phone:'2220000003',confirmed:true},'admin')).status,409);
 const old=codes.p0,r=await req('admin-reissue-code',b,'admin');assert.equal(r.status,200);assert.match(r.code,/^[A-F0-9]{12}$/);assert.notEqual(r.code,old);assert.equal(r.points,10);codes.p0=r.code;
 assert.equal((await req('reward-claim',{id:'1',poster,code:old},'p0')).status,403);
 const audit=(await db.pool.query('SELECT admin,old_code_hash,new_code_hash FROM freak_code_reissues')).rows;assert.equal(audit.length,1);assert.equal(audit[0].old_code_hash,hash(old));assert.equal(audit[0].new_code_hash,hash(r.code));assert.ok(audit[0].admin);
 const publicData=JSON.stringify(await req('rewards',undefined,'p0'));assert.ok(!publicData.includes(r.code));assert.ok(!publicData.includes('old_code_hash'));
});
test('claim requires login, a valid poster and personal validation code',async()=>{const b={id:'1',poster,code:codes.p0};assert.equal((await req('reward-claim',b)).status,401);assert.equal((await req('reward-claim',{...b,poster:'x'.repeat(43)},'p0')).status,400);assert.equal((await req('reward-claim',{...b,code:codes.p1},'p0')).status,403);});
test('two people racing one prize: one winner; loser can choose another; one prize per person',async()=>{const results=await Promise.all(['p0','p1'].map(who=>req('reward-claim',{id:'1',poster,code:codes[who]},who)));assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);const winner=results[0].status===200?'p0':'p1',loser=winner==='p0'?'p1':'p0';assert.equal((await req('reward-claim',{id:'1',poster,code:codes[winner]},winner)).status,200);assert.equal((await req('reward-claim',{id:'2',poster,code:codes[winner]},winner)).status,409);assert.equal((await req('reward-claim',{id:'2',poster,code:codes[loser]},loser)).status,200);assert.equal((await req('rewards')).prizes.filter(p=>p.taken).length,2);});
test('same person racing different prizes wins only one',async()=>{await db.pool.query("INSERT INTO freak_rewards(campaign,id,title,poster_hash) VALUES('prueba','4','Extra',$1)",[hash('extra')]);const result=await Promise.all(['3','4'].map(id=>req('reward-claim',{id,poster,code:codes.p2},'p2')));assert.deepEqual(result.map(r=>r.status).sort(),[200,409]);});
test('private people and codes never in public list; delivery authenticated and idempotent',async()=>{const publicData=await req('rewards');assert.ok(!JSON.stringify(publicData).includes('222000'));assert.ok(!JSON.stringify(publicData).includes(codes.p0));assert.equal((await req('admin-rewards')).status,401);assert.equal((await req('admin-deliver-reward',{id:'1'},'p0')).status,401);assert.equal((await req('admin-deliver-reward',{id:'1'},'admin')).status,200);assert.equal((await req('admin-deliver-reward',{id:'1'},'admin')).status,409);});

test('reissue is blocked after a prize is confirmed without changing code or audit',async()=>{
 const before=(await db.pool.query('SELECT code_hash FROM freak_physical_validations ORDER BY person')).rows;
 assert.equal((await req('admin-reissue-code',{name:'Persona A',phone:'2220000000',confirmed:true},'admin')).status,409);
 assert.deepEqual((await db.pool.query('SELECT code_hash FROM freak_physical_validations ORDER BY person')).rows,before);
 assert.equal((await db.pool.query('SELECT * FROM freak_code_reissues')).rowCount,1);
 const panel=await req('admin-rewards',undefined,'admin');assert.ok(panel.validations.find(v=>v.display_name==='Persona A').has_prize);
});

test('poster saving requires a phone account, is exclusive and survives returning without the QR',async()=>{
 const t=randomBytes(32).toString('base64url');
 await db.pool.query("INSERT INTO freak_rewards(campaign,id,title,poster_hash) VALUES('prueba','5','Reserva',$1)",[hash(t)]);
 assert.equal((await req('reserve-poster',{poster:t})).status,401);
 for(let i=5;i<7;i++)await req('register',{name:'Reserva '+String.fromCharCode(65+i),phone:'222000000'+i},'p'+i);
 const results=await Promise.all(['p5','p6'].map(w=>req('reserve-poster',{poster:t},w)));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const winner=results[0].status===200?'p5':'p6',idx=winner.slice(1);
 assert.equal((await req('reserve-poster',{poster:t},winner)).status,200);
 assert.ok((await req('rewards',undefined,winner)).reservation);
 assert.equal((await req('reward-claim',{id:'5'},winner)).status,403);
 assert.equal((await req('admin-validate-points',{name:'Reserva '+String.fromCharCode(65+Number(idx)),phone:'222000000'+idx,normal:10,special:0,marked:true},'admin')).status,200);
 assert.equal((await req('reward-claim',{id:'5'},winner)).status,200);
 assert.equal((await req('rewards')).reservation,null);
});

test('poster visits dedupe, location is admin-only, public data does not expose locations',async()=>{
 const visit=crypto.randomUUID();
 for(let i=0;i<2;i++)assert.equal((await req('poster-visit',{poster,visit})).status,200);
 assert.equal((await req('admin-poster-location',{id:'1',location:'Punto local de prueba'})).status,401);
 assert.equal((await req('admin-poster-location',{id:'1',location:'Punto local de prueba'},'admin')).status,200);
 const panel=await req('admin-rewards',undefined,'admin');assert.equal(panel.posters.find(p=>p.id==='1').scans,1);assert.equal(panel.posters.find(p=>p.id==='1').location,'Punto local de prueba');assert.ok(!JSON.stringify(await req('rewards')).includes('Punto local de prueba'));
});
