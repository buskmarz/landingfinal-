import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {NetlifyDB} from '@netlify/database-dev';
import {getDatabase} from '@netlify/database';
import {createHandler} from '../netlify/functions/freak.mjs';
import {resetPosterTest} from '../netlify/lib/freak-poster-reset.mjs';
let engine,db,handler;
const cookies={},tokens={},hash=s=>createHash('sha256').update(s).digest('hex');
async function request(op,body,who='admin',method=body?'POST':'GET'){
 const res=await handler(new Request('https://bmoodcoffee.com/api/freak?camp=prueba&op='+op,{method,headers:{origin:'https://bmoodcoffee.com','content-type':'application/json',cookie:cookies[who]||''},body:method==='POST'?JSON.stringify(body):undefined}),{ip:who+op});
 if(res.headers.get('set-cookie'))cookies[who]=res.headers.get('set-cookie').split(';')[0];
 return {status:res.status,...await res.json()};
}
const panel=()=>request('admin-rewards');
const body=p=>({id:p.id,resetKey:p.resetKey,confirm:`BORRAR PRUEBA QR ${p.id}`});
async function rows(table,where='',args=[]){return (await db.pool.query('SELECT * FROM '+table+where,args)).rows.map(r=>JSON.stringify(r)).sort();}
before(async()=>{
 engine=new NetlifyDB();db=getDatabase({connectionString:await engine.start()});db.pool.options.max=1;
 for(const f of (await fs.readdir('netlify/database/migrations')).filter(f=>f.includes('freak')&&!f.includes('inventory')).sort())await db.pool.query(await fs.readFile('netlify/database/migrations/'+f,'utf8'));
 handler=createHandler(db);const key=randomBytes(32).toString('base64url');await db.pool.query("UPDATE freak_admins SET key_hash=$1 WHERE id='owner'",[hash(key)]);assert.equal((await request('admin-login',{key})).status,200);
 for(let i=1;i<=5;i++){
  tokens[i]=randomBytes(32).toString('base64url');
  await db.pool.query('INSERT INTO freak_rewards(campaign,id,title,poster_hash) VALUES($1,$2,$3,$4)',['prueba',String(i),'Premio '+i,hash(tokens[i])]);
 }
 for(const id of ['2','3','4','5']){
  assert.equal((await request('register',{name:id==='2'?'Miguel ficticio':'Persona ficticia '+String.fromCharCode(65+Number(id)),phone:'222000000'+id,recovery:'802173'},id)).status,200);
  assert.equal((await request('poster-visit',{poster:tokens[id],visit:randomUUID(),event:randomUUID()},id)).status,200);
  assert.equal((await request('reserve-poster',{poster:tokens[id]},id)).status,200);
 }
 await request('ticket-open',{visitor:randomUUID(),event:randomUUID(),source:'boleto'},'2');
 // Same QR number in a different campaign must survive the targeted reset.
 await db.pool.query("INSERT INTO freak_rewards(campaign,id,title,poster_hash) VALUES('freak-2026','2','Otra campaña',$1) ON CONFLICT DO NOTHING",[hash('other-campaign')]);
 await db.pool.query("INSERT INTO freak_poster_open_events(id,campaign,poster_id,visit,occupied) VALUES($1,'freak-2026','2',$2,false)",[randomUUID(),randomUUID()]);
});
after(async()=>{await db?.pool.end();await engine?.stop();});

test('single QR reset requires admin, POST and exact confirmation',async()=>{
 const p=(await panel()).posters.find(p=>p.id==='2');
 assert.match(p.resetKey,/^[a-f0-9]{64}$/);
 assert.equal((await request('admin-reset-poster-test',body(p),'2')).status,401);
 assert.equal((await request('admin-reset-poster-test',undefined)).status,405);
 for(const b of [{...body(p),confirm:'BORRAR TODO'},{...body(p),id:'6'},{...body(p),id:2},{...body(p),resetKey:''}])assert.equal((await request('admin-reset-poster-test',b)).status,400);
 assert.equal((await db.pool.query('SELECT * FROM freak_reset_audit')).rowCount,0);
});
test('stale owner/activity confirmation refuses to erase any records',async()=>{
 const p=(await panel()).posters.find(p=>p.id==='2');
 await request('poster-visit',{poster:tokens[2],visit:randomUUID(),event:randomUUID()},'2');
 assert.equal((await request('admin-reset-poster-test',body(p))).status,409);
 assert.equal((await panel()).posters.find(p=>p.id==='2').opens,2);
 assert.equal((await db.pool.query('SELECT * FROM freak_reset_audit')).rowCount,0);
});
test('failed backup rolls the transaction back before any deletion',async()=>{
 const p=(await panel()).posters.find(p=>p.id==='2');
 const before=await rows('freak_poster_reservations');
 const failBackupDb={pool:{connect:async()=>{
  const client=await db.pool.connect();return {query:(sql,args)=>sql.startsWith('INSERT INTO freak_reset_audit')?Promise.reject(Error('Simulated backup failure')):client.query(sql,args),release:()=>client.release()};
 }}};
 await assert.rejects(resetPosterTest({req:{method:'POST'},body:body(p),db:failBackupDb,campaign:'prueba',admin:{admin:'owner'},json:x=>x}),/Simulated backup failure/);
 assert.deepEqual(await rows('freak_poster_reservations'),before);
 assert.equal((await db.pool.query('SELECT * FROM freak_reset_audit')).rowCount,0);
});
test('reset archives exactly one QR and preserves all other QRs, people, prizes, locations and ticket statistics',async()=>{
 const otherTables=['freak_rewards','freak_people','freak_poster_locations','freak_physical_validations','freak_ticket_open_events'];
 const posterTables=['freak_poster_reservations','freak_poster_visits','freak_poster_open_events','freak_poster_save_events'];
 const before={};for(const t of otherTables)before[t]=await rows(t);
 for(const t of posterTables)before[t]=await rows(t,' WHERE campaign<>$2 OR poster_id<>$1',['2','prueba']);
 const previous=(await panel()).posters.find(p=>p.id==='2');
 const result=await request('admin-reset-poster-test',body(previous));
 assert.equal(result.status,200);assert.equal(result.poster_id,'2');assert.equal(result.archivedOpens,2);assert.ok(result.audit_id);
 for(const t of otherTables)assert.deepEqual(await rows(t),before[t],t);
 for(const t of posterTables){assert.deepEqual(await rows(t,' WHERE campaign<>$2 OR poster_id<>$1',['2','prueba']),before[t],t);assert.equal((await rows(t,' WHERE campaign=$1 AND poster_id=$2',['prueba','2'])).length,0,t);}
 const after=(await panel()).posters.find(p=>p.id==='2');assert.equal(after.saved_at,null);assert.equal(after.opens,0);assert.equal(after.scans,0);assert.equal(after.attempts,0);
 const audit=(await db.pool.query('SELECT snapshot FROM freak_reset_audit')).rows[0].snapshot;
 assert.equal(audit.scope,'single-prize-qr-test');assert.equal(audit.poster_id,'2');assert.equal(audit.freak_poster_reservations.length,1);assert.equal(audit.freak_poster_open_events.length,2);assert.equal(audit.registration.display_name,'Miguel ficticio');
 assert.equal((await request('admin-reset-poster-test',body(previous))).status,409);assert.equal((await db.pool.query('SELECT * FROM freak_reset_audit')).rowCount,1);
 // The printed token is still valid and can be saved by a different participant.
 assert.equal((await request('register',{name:'Otra persona ficticia',phone:'2220000006',recovery:'802173'},'6')).status,200);
 assert.equal((await request('reserve-poster',{poster:tokens[2]},'6')).status,200);
 assert.equal((await request('rewards',undefined,'6')).reservation.poster_id,'2');
});
test('validated participants and confirmed prizes cannot be cleared as tests',async()=>{
 const pre=(await panel()).posters.find(p=>p.id==='3');
 assert.equal((await request('admin-validate-points',{name:'Persona ficticia D',phone:'2220000003',normal:10,special:0,marked:true})).status,200);
 const before=await rows('freak_poster_reservations');
 assert.equal((await request('admin-reset-poster-test',body(pre))).status,409);
 assert.equal((await request('reward-claim',{id:'1'},'3')).status,200);
 const current=(await panel()).posters.find(p=>p.id==='3');assert.equal(current.claimed,true);
 assert.equal((await request('admin-reset-poster-test',body(current))).status,409);
 assert.deepEqual(await rows('freak_poster_reservations'),before);
 assert.equal((await db.pool.query('SELECT * FROM freak_reset_audit')).rowCount,1);
});
