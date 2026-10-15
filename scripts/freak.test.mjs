import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';
import {NetlifyDB} from '@netlify/database-dev';
import {getDatabase} from '@netlify/database';
import {createHandler} from '../netlify/functions/freak.mjs';
let engine,db,handler;const tokens=Array.from({length:4},()=>randomBytes(32).toString('base64url'));
const cookies={};const recovery={};
async function request(op,{method='GET',body,who='',campaign='prueba',token,origin='https://bmoodcoffee.com',ip='qa-default'}={}){
 if(op==='register'&&body?.phone&&!('name' in body))body={...body,name:'Persona QA'};
 const response=await handler(new Request(`https://bmoodcoffee.com/api/freak?op=${op}&camp=${campaign}`,{method,headers:{origin,'content-type':'application/json',...(cookies[who]?{cookie:cookies[who]}:{}),...(token?{'X-Freak-Ticket':token}:{})},...(body?{body:JSON.stringify(body)}:{})}),{ip});
 const result=await response.json();if(response.headers.get('set-cookie'))cookies[who]=response.headers.get('set-cookie').split(';')[0];return {status:response.status,...result};
}
before(async()=>{engine=new NetlifyDB();const connectionString=await engine.start();db=getDatabase({connectionString});const exists=await db.pool.query("SELECT to_regclass('freak_campaigns') AS name");if(!exists.rows[0].name)await db.pool.query(await fs.readFile('netlify/database/migrations/20261015193000_freak.sql','utf8'));await db.pool.query(await fs.readFile('netlify/database/migrations/20261015213000_freak_admin.sql','utf8'));await db.pool.query(await fs.readFile('netlify/database/migrations/20261015220000_freak_launch.sql','utf8'));await db.pool.query(await fs.readFile('netlify/database/migrations/20261015233000_freak_access_order.sql','utf8'));await db.pool.query(await fs.readFile('netlify/database/migrations/20261016010000_freak_phone_community.sql','utf8'));await db.pool.query(await fs.readFile('netlify/database/migrations/20261016020000_freak_names_reset.sql','utf8'));await db.pool.query(await fs.readFile('netlify/database/migrations/20261016030000_freak_found_location.sql','utf8'));await db.pool.query("UPDATE freak_campaigns SET active=false WHERE id='freak-2026'");await db.pool.query('DELETE FROM freak_tickets');for(let i=0;i<4;i++)await db.pool.query('INSERT INTO freak_tickets(campaign,number,token_hash,act,rare,release_at) VALUES($1,$2,$3,$4,$5,$6)',['prueba',i+1,createHash('sha256').update(tokens[i]).digest('hex'),i===1?3:i===3?0:i,i===1,i===2?'2099-01-01':'2026-01-01']);await db.pool.query("UPDATE freak_tickets SET short_code='AB'||lpad((number+2)::text,2,'2')");handler=createHandler(db)});
after(async()=>{await db?.pool.end();await engine?.stop()});
test('GET inspection never assigns a ticket; invalid and locked states',async()=>{assert.equal((await request('ticket',{token:tokens[0]})).state,'available');assert.equal((await request('ticket',{token:tokens[0]})).state,'available');assert.equal((await request('ticket',{token:tokens[2]})).state,'unreleased');assert.equal((await request('ticket',{token:'x'.repeat(43)})).status,404);});
test('register recoverable aliases and protect sessions',async()=>{for(const who of ['A','B']){const r=await request('register',{method:'POST',body:{phone:who==='A'?'2220000001':'2220000002',name:`Artista ${who}`},who});assert.equal(r.status,200);assert.match(r.recovery,/^\d{4}$/);recovery[who]=r.recovery;assert.ok(cookies[who].includes('__Secure-freak='));}assert.equal((await request('register',{method:'POST',body:{phone:'2220000001'},who:'duplicate'})).status,409);assert.equal((await request('claim',{method:'POST',body:{token:tokens[0]}})).status,401);assert.equal((await request('register',{method:'POST',body:{phone:'2220000003'},campaign:'freak-2026'})).status,423);});
test('two users racing one QR yields one global owner; retry is idempotent',async()=>{const results=await Promise.all(['A','B'].map(who=>request('claim',{method:'POST',body:{token:tokens[0],location:{consent:true,latitude:who==='A'?19:20,longitude:-98,accuracy:6}},who})));assert.deepEqual(results.map(r=>r.state).sort(),['occupied','owned']);const winner=results[0].state==='owned'?'A':'B';assert.equal((await request('claim',{method:'POST',body:{token:tokens[0]},who:winner})).state,'owned');const {rows}=await db.pool.query('SELECT count(*)::int AS n FROM freak_tickets WHERE owner IS NOT NULL');assert.equal(rows[0].n,1);});
test('rare claim, persistent collection and distinct artist totals',async()=>{const r=await request('claim',{method:'POST',body:{token:tokens[1]},who:'B'});assert.equal(r.state,'owned');assert.equal(r.ticket.rare,true);const state=await request('state',{who:'B'});assert.ok(state.owned.some(t=>t.rare));assert.equal(state.ranking.find(r=>r.name==='Artista B').artists,new Set(state.owned.map(t=>t.act)).size);assert.ok(!JSON.stringify(state).includes('token_hash'));assert.equal((await request('claim',{method:'POST',body:{token:tokens[2]},who:'A'})).state,'unreleased');});
test('recovery in a new session restores the server collection',async()=>{cookies.C='';const login=await request('login',{method:'POST',body:{phone:'2220000002',recovery:recovery.B},who:'C'});assert.equal(login.status,200);assert.deepEqual((await request('state',{who:'C'})).owned,(await request('state',{who:'B'})).owned);assert.equal((await request('login',{method:'POST',body:{phone:'2220000002',recovery:'wrong'.repeat(5)},who:'D'})).status,401);});
test('campaign isolation, CSRF, GET claim rejection and logout',async()=>{assert.equal((await request('state',{who:'C',campaign:'freak-2026'})).person,null);assert.equal((await request('claim',{token:tokens[3],who:'C'})).status,405);assert.equal((await request('claim',{method:'POST',body:{token:tokens[3]},who:'C',origin:'https://evil.example'})).status,403);assert.equal((await request('logout',{method:'POST',body:{},who:'C'})).status,200);assert.equal((await request('state',{who:'C'})).person,null);});
test('rate limiter atomically blocks writes beyond limit',async()=>{const attempts=await Promise.all(Array.from({length:31},(_,i)=>request('login',{method:'POST',body:{alias:'nonexistent'+i,recovery:'short'},ip:'rate-test'})));assert.equal(attempts.filter(r=>r.status===429).length,1);});
test('admin authorization, private location history, conflict and validation',async()=>{
 const key=randomBytes(32).toString('base64url');await db.pool.query('UPDATE freak_admins SET key_hash=$1 WHERE id=$2',[createHash('sha256').update(key).digest('hex'),'owner']);
 assert.equal((await request('admin-list',{who:'A',ip:'admin'})).status,401);
 assert.equal((await request('admin-save',{method:'POST',body:{number:1},ip:'admin'})).status,401);
 assert.equal((await request('admin-login',{method:'POST',body:{key:'x'.repeat(43)},ip:'admin'})).status,401);
 assert.equal((await request('admin-login',{method:'POST',body:{key},who:'admin',ip:'admin'})).status,200);
 const save={number:1,version:0,place:'QA local',reference:'Entrada, columna',latitude:19.04,longitude:-98.21,accuracy:8,physical:'placed'};
 assert.equal((await request('admin-save',{method:'POST',body:{...save,latitude:100},who:'admin',ip:'admin'})).status,400);
 assert.equal((await request('admin-save',{method:'POST',body:save,who:'admin',ip:'admin',origin:'https://evil.example'})).status,403);
 assert.equal((await request('admin-save',{method:'POST',body:save,who:'admin',ip:'admin'})).status,200);
 assert.equal((await request('admin-save',{method:'POST',body:save,who:'admin',ip:'admin'})).status,409);
 const list=await request('admin-list',{who:'admin',ip:'admin'});assert.equal(list.tickets[0].place,'QA local');assert.equal(list.history.length,1);assert.equal(list.tickets[0].version,1);
 assert.ok(!JSON.stringify(await request('state',{ip:'admin'})).includes('QA local'));
 assert.equal((await request('admin-list',{who:'admin',campaign:'freak-2026',ip:'admin'})).tickets.length,0);
 assert.equal((await request('admin-lookup',{method:'POST',body:{token:tokens[0]},who:'admin',ip:'admin'})).number,1);
 await request('admin-logout',{method:'POST',body:{},who:'admin',ip:'admin'});assert.equal((await request('admin-list',{who:'admin',ip:'admin'})).status,401);
});
test('opening telemetry is deduplicated, private and does not claim',async()=>{
 const visit='67f48736-a156-425b-a465-2c9dba0f2d36';
 for(let i=0;i<2;i++)assert.equal((await request('visit',{method:'POST',body:{token:tokens[3],visit},ip:'visits'})).status,200);
 assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM freak_visits')).rows[0].n,1);
 assert.equal((await request('ticket',{token:tokens[3],ip:'visits'})).state,'available');
 assert.equal((await request('visit',{method:'POST',body:{token:tokens[3],visit:'bad'},ip:'visits'})).status,400);
 await request('visit',{method:'POST',body:{token:tokens[3],visit},campaign:'freak-2026',ip:'visits'});
 assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM freak_visits')).rows[0].n,1);
});
test('physical receipts require admin, block duplicates and preserve digital ownership',async()=>{
 const key=randomBytes(32).toString('base64url');await db.pool.query('UPDATE freak_admins SET key_hash=$1 WHERE id=$2',[createHash('sha256').update(key).digest('hex'),'owner']);
 await request('admin-login',{method:'POST',body:{key},who:'desk',ip:'physical'});
 const code=(await db.pool.query('SELECT short_code FROM freak_tickets WHERE number=4')).rows[0].short_code;
 assert.equal((await request('admin-receive',{method:'POST',body:{code,phone:'2221110011',name:'Fisico Uno'},who:'A',ip:'physical'})).status,401);
 assert.equal((await request('admin-receive',{method:'POST',body:{code,phone:'2221110011',name:'Fisico Uno'},who:'desk',ip:'physical'})).status,200);
 assert.equal((await request('admin-receive',{method:'POST',body:{code,phone:'2221110011',name:'Fisico Uno'},who:'desk',ip:'physical'})).status,409);
 assert.equal((await request('claim',{method:'POST',body:{token:tokens[3]},who:'A',ip:'physical'})).state,'received');
 const rare=(await db.pool.query('SELECT short_code FROM freak_tickets WHERE number=2')).rows[0].short_code;
 assert.equal((await request('admin-receive',{method:'POST',body:{code:rare,phone:'2221110022',name:'Otro Nombre'},who:'desk',ip:'physical'})).status,409);
 assert.equal((await request('admin-receive',{method:'POST',body:{code:rare,phone:'2220000002'},who:'desk',ip:'physical'})).status,200);
 assert.equal((await request('state',{who:'B',ip:'physical'})).owned.filter(t=>t.number===2).length,1);
 assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM freak_receipt_history')).rows[0].n,2);
});
test('physical hand-in racing a digital claim cannot give the ticket to two collectors',async()=>{
 const token=randomBytes(32).toString('base64url');await db.pool.query("INSERT INTO freak_tickets(campaign,number,token_hash,act,rare,release_at,short_code) VALUES('prueba',5,$1,0,false,'2026-01-01','RACE')",[createHash('sha256').update(token).digest('hex')]);
 const [physical,digital]=await Promise.all([request('admin-receive',{method:'POST',body:{code:'RACE',phone:'2221110033',name:'Persona Fisica'},who:'desk',ip:'race'}),request('claim',{method:'POST',body:{token},who:'A',ip:'race'})]);
 const t=(await db.pool.query("SELECT owner,received_at FROM freak_tickets WHERE campaign='prueba' AND number=5")).rows[0];assert.ok(Boolean(t.owner)!==Boolean(t.received_at),JSON.stringify({physical,digital,t}));assert.ok((physical.status===200&&digital.state==='received')||(physical.status===409&&digital.state==='owned'));
});
test('phone suffix is the access key, legacy routes removed and distributed attempts limited',async()=>{
 const created=await request('register',{method:'POST',body:{phone:'2224440012'},who:'short',ip:'short-new'});assert.equal(created.recovery,'0012');
 assert.equal((await request('login',{method:'POST',body:{phone:'2224440012',recovery:'0012'},who:'short2',ip:'short-login'})).status,200);
 assert.equal((await request('login',{method:'POST',body:{alias:'Artista A',recovery:'0001'},ip:'legacy-login'})).status,400);
 for(const op of ['short-access','link-phone'])assert.equal((await request(op,{method:'POST',body:{phone:'2224440012'},who:'short',ip:'legacy-'+op})).status,404);
 const attempts=await Promise.all(Array.from({length:6},(_,i)=>request('login',{method:'POST',body:{phone:'2229990000',recovery:'1234'},ip:'distributed-'+i})));
 assert.equal(attempts.filter(r=>r.status===401).length,5);assert.equal(attempts.filter(r=>r.status===429).length,1);
});
test('phone registration normalizes formats, blocks duplicates and keeps phone private',async()=>{
 const r=await request('register',{method:'POST',body:{phone:'222 123 4567'},who:'phone',ip:'phone-new'});
 assert.equal(r.status,200);assert.equal(r.person.phone,'+522221234567');assert.match(r.recovery,/^\d{4}$/);recovery.phone=r.recovery;
 assert.equal((await request('register',{method:'POST',body:{phone:'222-123-4567'},ip:'phone-duplicate'})).status,409);
 assert.equal((await request('register',{method:'POST',body:{phone:'123'},ip:'phone-invalid'})).status,400);
 assert.equal((await request('login',{method:'POST',body:{phone:'2221234567',recovery:r.recovery.toLowerCase()},who:'phone2',ip:'phone-login'})).status,200);
 assert.equal((await request('state',{who:'phone2',ip:'phone-state'})).person.id,r.person.id);
 assert.ok(!JSON.stringify(await request('state',{ip:'public-phone'})).includes('2221234567'));
 const race=await Promise.all(['2229876543','222 987 6543'].map((phone,i)=>request('register',{method:'POST',body:{phone},who:'phone-race'+i,ip:'phone-race'+i})));
 assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
});
test('existing phone account uses suffix despite its old hash, preserving collection',async()=>{
 const before=await request('state',{who:'A',ip:'existing-before'});
 await db.pool.query("UPDATE freak_people SET recovery_hash=repeat('0',128) WHERE phone='+522220000001'");
 assert.equal((await request('login',{method:'POST',body:{phone:'2220000001',recovery:'0001'},who:'existing',ip:'existing-login'})).status,200);
 assert.deepEqual((await request('state',{who:'existing',ip:'existing-after'})).owned,before.owned);
 for(const phone of ['+522220000001','522220000001','+12025550199','123'])assert.equal((await request('register',{method:'POST',body:{phone},ip:'invalid-'+phone})).status,400);
});
test('phone physical reception preserves identity and rejects competing phone and repeats',async()=>{
 const token=randomBytes(32).toString('base64url');await db.pool.query("INSERT INTO freak_tickets(campaign,number,token_hash,act,rare,release_at,short_code) VALUES('prueba',6,$1,0,false,'2026-01-01','PHON')",[createHash('sha256').update(token).digest('hex')]);
 assert.equal((await request('claim',{method:'POST',body:{token,location:{consent:true,latitude:19.044,longitude:-98.211,accuracy:9}},who:'phone',ip:'phone-claim'})).state,'owned');
 assert.equal((await request('admin-receive',{method:'POST',body:{code:'PHON',phone:'2220000009'},who:'desk',ip:'phone-receipt'})).status,409);
 assert.equal((await request('admin-receive',{method:'POST',body:{code:'PHON',phone:'2221234567'},who:'desk',ip:'phone-receipt'})).status,200);
 assert.equal((await request('admin-receive',{method:'POST',body:{code:'PHON',phone:'2221234567'},who:'desk',ip:'phone-receipt'})).status,409);
 const list=await request('admin-list',{who:'desk',ip:'phone-admin'});assert.equal(list.tickets.find(t=>t.number===6).received_phone,'+522221234567');
 const publicState=await request('state',{ip:'phone-public2'});assert.ok(!JSON.stringify(publicState).includes('2221234567'));assert.equal(publicState.ranking.find(r=>r.name==='Persona QA').artists,1);
});
test('public clues require admin, persist, handle conflicting edits, and can be removed',async()=>{
 assert.equal((await request('admin-hint',{method:'POST',body:{hint:'Nueva pista',version:0},ip:'hint'})).status,401);
 assert.equal((await request('admin-hint',{method:'POST',body:{hint:'Busca una estrella',version:0},who:'desk',ip:'hint'})).status,200);
 assert.equal((await request('state',{ip:'hint-read'})).campaign.public_hint,'Busca una estrella');
 assert.equal((await request('admin-hint',{method:'POST',body:{hint:'Vieja pista',version:0},who:'desk',ip:'hint'})).status,409);
 assert.equal((await request('admin-hint',{method:'POST',body:{hint:'',version:1},who:'desk',ip:'hint'})).status,200);
 assert.equal((await request('state',{ip:'hint-read'})).campaign.public_hint,'');
});
test('name is required and shown in community only after collecting',async()=>{
 assert.equal((await request('register',{method:'POST',body:{phone:'2223330098',name:''},ip:'name-empty'})).status,400);
 assert.equal((await request('register',{method:'POST',body:{phone:'2223330098',name:'<script>'},ip:'name-html'})).status,400);
 const p=await request('register',{method:'POST',body:{phone:'2223330098',name:'  Ana   María  '},who:'named',ip:'name-new'});assert.equal(p.person.display_name,'Ana María');
 const state=await request('state',{who:'named',ip:'name-read'});assert.equal(state.person.display_name,'Ana María');
 assert.ok(!JSON.stringify(await request('state',{ip:'name-public'})).includes('Ana María'));
 assert.ok((await request('admin-list',{who:'desk',ip:'name-admin'})).people.some(p=>p.display_name==='Ana María'));
});
test('only admin can reset a sticker, stale reset blocked and QR stays identical',async()=>{
 let list=await request('admin-list',{who:'desk',ip:'reset-list'});const t=list.tickets.find(t=>t.number===6);const before=(await db.pool.query("SELECT * FROM freak_tickets WHERE campaign='prueba' AND number=6")).rows[0];
 assert.equal((await request('admin-unlink',{method:'POST',body:{number:6,resetKey:t.resetKey},who:'phone',ip:'reset-public'})).status,401);
 assert.equal((await request('admin-unlink',{method:'POST',body:{number:6,resetKey:'stale'},who:'desk',ip:'reset-stale'})).status,409);
 assert.equal((await request('admin-unlink',{method:'POST',body:{number:6,resetKey:t.resetKey},who:'desk',ip:'reset'})).status,200);
 const after=(await db.pool.query("SELECT * FROM freak_tickets WHERE campaign='prueba' AND number=6")).rows[0];for(const k of ['number','display_number','short_code','token_hash','act','rare','release_at'])assert.deepEqual(after[k],before[k]);for(const k of ['owner','claimed_at','received_at','received_phone','received_name','found_latitude','found_longitude','found_accuracy'])assert.equal(after[k],null);
 assert.equal((await request('state',{who:'phone',ip:'reset-owner'})).owned.length,0);
 assert.equal((await db.pool.query("SELECT count(*)::int AS n FROM freak_reset_audit WHERE number=6")).rows[0].n,1);
 assert.equal((await request('admin-unlink',{method:'POST',body:{number:6,resetKey:t.resetKey},who:'desk',ip:'reset-old'})).status,409);
});
test('unlinked sticker can be collected again by one of two people, never both',async()=>{
 const token=randomBytes(32).toString('base64url');await db.pool.query("INSERT INTO freak_tickets(campaign,number,token_hash,act,rare,release_at,short_code) VALUES('prueba',7,$1,1,false,'2026-01-01','NEWX')",[createHash('sha256').update(token).digest('hex')]);
 await request('claim',{method:'POST',body:{token},who:'phone',ip:'new-claim'});
 const ticket=(await request('admin-list',{who:'desk',ip:'new-list'})).tickets.find(t=>t.number===7);
 await request('admin-unlink',{method:'POST',body:{number:7,resetKey:ticket.resetKey},who:'desk',ip:'new-reset'});
 const race=await Promise.all(['phone','named'].map((who,i)=>request('claim',{method:'POST',body:{token},who,ip:'new-race'+i})));assert.deepEqual(race.map(r=>r.state).sort(),['occupied','owned']);
});
test('GPS is opt-in, immutable after claim, private and accurate to supplied precision',async()=>{
 const stored=(await db.pool.query("SELECT * FROM freak_tickets WHERE campaign='prueba' AND number=1")).rows[0];
 assert.ok([19,20].includes(stored.found_latitude));assert.equal(stored.found_accuracy,6);
 const winner=(await request('state',{who:'A',ip:'gps-owner'})).person.id===stored.owner?'A':'B';
 await request('claim',{method:'POST',body:{token:tokens[0],location:{consent:true,latitude:0,longitude:0,accuracy:1}},who:winner,ip:'gps-repeat'});
 assert.equal((await db.pool.query("SELECT found_latitude FROM freak_tickets WHERE campaign='prueba' AND number=1")).rows[0].found_latitude,stored.found_latitude);
 for(const location of [{latitude:19,longitude:-98,accuracy:5},{consent:true,latitude:91,longitude:0,accuracy:1},{consent:true,latitude:19,longitude:-98,accuracy:-1}])assert.equal((await request('claim',{method:'POST',body:{token:tokens[0],location},who:winner,ip:'gps-invalid'})).status,400);
 for(const response of [await request('state',{who:winner,ip:'gps-public'}),await request('ticket',{token:tokens[0],ip:'gps-ticket'})]){assert.ok(!JSON.stringify(response).includes('found_latitude'));assert.ok(!JSON.stringify(response).includes('2220000002')||response.person);}
 const list=await request('admin-list',{who:'desk',ip:'gps-admin'});assert.equal(list.tickets.find(t=>t.number===1).found_latitude,stored.found_latitude);
 const publicState=await request('state',{ip:'names-public'});assert.ok(publicState.ranking.some(r=>r.name==='Artista B'));assert.ok(!JSON.stringify(publicState).includes('2220000002'));assert.ok(!JSON.stringify(publicState).includes('Coleccionista '));
});
test('campaign reset archives tests, clears accounts and activity, preserves all inventory and other campaign',async()=>{
 await db.pool.query("INSERT INTO freak_tickets(campaign,number,token_hash,act,rare,release_at,short_code) VALUES('freak-2026',1,$1,0,false,'2026-01-01','OTHR')",[createHash('sha256').update('other-campaign').digest('hex')]);

 const before=(await db.pool.query('SELECT campaign,number,token_hash,short_code,act,rare,display_number,release_at FROM freak_tickets ORDER BY campaign,number')).rows;
 assert.equal((await request('admin-reset-campaign',{method:'POST',body:{confirm:'REINICIAR prueba'},ip:'reset-all-anon'})).status,401);
 assert.equal((await request('admin-reset-campaign',{method:'POST',body:{confirm:'REINICIAR freak-2026'},who:'desk',ip:'reset-all-bad'})).status,400);
 assert.equal((await request('admin-reset-campaign',{method:'POST',body:{confirm:'REINICIAR prueba'},who:'desk',ip:'reset-all'})).status,200);
 assert.deepEqual((await db.pool.query('SELECT campaign,number,token_hash,short_code,act,rare,display_number,release_at FROM freak_tickets ORDER BY campaign,number')).rows,before);
 for(const table of ['freak_people','freak_locations','freak_visits','freak_location_history','freak_receipt_history'])assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM '+table+" WHERE campaign='prueba'")).rows[0].n,0);
 assert.equal((await request('state',{who:'phone',ip:'reset-session'})).person,null);
 const list=await request('admin-list',{who:'desk',ip:'reset-empty'});assert.ok(list.tickets.every(t=>!t.owner&&!t.received_at&&!t.phone&&!t.display_name&&t.opens===0&&t.physical==='unplaced'));
 assert.ok((await db.pool.query('SELECT snapshot FROM freak_reset_audit WHERE number IS NULL')).rows[0].snapshot.people.length>0);
});
