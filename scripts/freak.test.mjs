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
 const response=await handler(new Request(`https://bmoodcoffee.com/api/freak?op=${op}&camp=${campaign}`,{method,headers:{origin,'content-type':'application/json',...(cookies[who]?{cookie:cookies[who]}:{}),...(token?{'X-Freak-Ticket':token}:{})},...(body?{body:JSON.stringify(body)}:{})}),{ip});
 const result=await response.json();if(response.headers.get('set-cookie'))cookies[who]=response.headers.get('set-cookie').split(';')[0];return {status:response.status,...result};
}
before(async()=>{engine=new NetlifyDB();const connectionString=await engine.start();db=getDatabase({connectionString});const exists=await db.pool.query("SELECT to_regclass('freak_campaigns') AS name");if(!exists.rows[0].name)await db.pool.query(await fs.readFile('netlify/database/migrations/20261015193000_freak.sql','utf8'));await db.pool.query(await fs.readFile('netlify/database/migrations/20261015213000_freak_admin.sql','utf8'));await db.pool.query(await fs.readFile('netlify/database/migrations/20261015220000_freak_launch.sql','utf8'));await db.pool.query(await fs.readFile('netlify/database/migrations/20261015233000_freak_access_order.sql','utf8'));await db.pool.query("UPDATE freak_campaigns SET active=false WHERE id='freak-2026'");await db.pool.query('DELETE FROM freak_tickets');for(let i=0;i<4;i++)await db.pool.query('INSERT INTO freak_tickets(campaign,number,token_hash,act,rare,release_at) VALUES($1,$2,$3,$4,$5,$6)',['prueba',i+1,createHash('sha256').update(tokens[i]).digest('hex'),i===1?3:i===3?0:i,i===1,i===2?'2099-01-01':'2026-01-01']);await db.pool.query("UPDATE freak_tickets SET short_code='AB'||lpad((number+2)::text,2,'2')");handler=createHandler(db)});
after(async()=>{await db?.pool.end();await engine?.stop()});
test('GET inspection never assigns a ticket; invalid and locked states',async()=>{assert.equal((await request('ticket',{token:tokens[0]})).state,'available');assert.equal((await request('ticket',{token:tokens[0]})).state,'available');assert.equal((await request('ticket',{token:tokens[2]})).state,'unreleased');assert.equal((await request('ticket',{token:'x'.repeat(43)})).status,404);});
test('register recoverable aliases and protect sessions',async()=>{for(const who of ['A','B']){const r=await request('register',{method:'POST',body:{alias:`Artista ${who}`},who});assert.equal(r.status,200);assert.match(r.recovery,/^[A-HJ-NP-Z2-9]{4}$/);recovery[who]=r.recovery;assert.ok(cookies[who].includes('__Secure-freak='));}assert.equal((await request('register',{method:'POST',body:{alias:'artista a'},who:'duplicate'})).status,409);assert.equal((await request('claim',{method:'POST',body:{token:tokens[0]}})).status,401);assert.equal((await request('register',{method:'POST',body:{alias:'closed'},campaign:'freak-2026'})).status,423);});
test('two users racing one QR yields one global owner; retry is idempotent',async()=>{const results=await Promise.all(['A','B'].map(who=>request('claim',{method:'POST',body:{token:tokens[0]},who})));assert.deepEqual(results.map(r=>r.state).sort(),['occupied','owned']);const winner=results[0].state==='owned'?'A':'B';assert.equal((await request('claim',{method:'POST',body:{token:tokens[0]},who:winner})).state,'owned');const {rows}=await db.pool.query('SELECT count(*)::int AS n FROM freak_tickets WHERE owner IS NOT NULL');assert.equal(rows[0].n,1);});
test('rare claim, persistent collection, total and rare tie breakers',async()=>{const r=await request('claim',{method:'POST',body:{token:tokens[1]},who:'B'});assert.equal(r.state,'owned');assert.equal(r.ticket.rare,true);const state=await request('state',{who:'B'});assert.ok(state.owned.some(t=>t.rare));assert.equal(state.ranking[0].alias,'Artista B');assert.ok(!JSON.stringify(state).includes('token_hash'));assert.equal((await request('claim',{method:'POST',body:{token:tokens[2]},who:'A'})).state,'unreleased');});
test('recovery in a new session restores the server collection',async()=>{cookies.C='';const login=await request('login',{method:'POST',body:{alias:'Artista B',recovery:recovery.B},who:'C'});assert.equal(login.status,200);assert.deepEqual((await request('state',{who:'C'})).owned,(await request('state',{who:'B'})).owned);assert.equal((await request('login',{method:'POST',body:{alias:'Artista B',recovery:'wrong'.repeat(5)},who:'D'})).status,401);});
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
 assert.equal((await request('admin-receive',{method:'POST',body:{code,alias:'Fisico Uno'},who:'A',ip:'physical'})).status,401);
 assert.equal((await request('admin-receive',{method:'POST',body:{code,alias:'Fisico Uno'},who:'desk',ip:'physical'})).status,200);
 assert.equal((await request('admin-receive',{method:'POST',body:{code,alias:'Fisico Uno'},who:'desk',ip:'physical'})).status,409);
 assert.equal((await request('claim',{method:'POST',body:{token:tokens[3]},who:'A',ip:'physical'})).state,'received');
 const rare=(await db.pool.query('SELECT short_code FROM freak_tickets WHERE number=2')).rows[0].short_code;
 assert.equal((await request('admin-receive',{method:'POST',body:{code:rare,alias:'Otro Alias'},who:'desk',ip:'physical'})).status,409);
 assert.equal((await request('admin-receive',{method:'POST',body:{code:rare,alias:'Artista B'},who:'desk',ip:'physical'})).status,200);
 assert.equal((await request('state',{who:'B',ip:'physical'})).owned.filter(t=>t.number===2).length,1);
 assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM freak_receipt_history')).rows[0].n,2);
});
test('physical hand-in racing a digital claim cannot give the ticket to two collectors',async()=>{
 const token=randomBytes(32).toString('base64url');await db.pool.query("INSERT INTO freak_tickets(campaign,number,token_hash,act,rare,release_at,short_code) VALUES('prueba',5,$1,0,false,'2026-01-01','RACE')",[createHash('sha256').update(token).digest('hex')]);
 const [physical,digital]=await Promise.all([request('admin-receive',{method:'POST',body:{code:'RACE',alias:'Persona Fisica'},who:'desk',ip:'race'}),request('claim',{method:'POST',body:{token},who:'A',ip:'race'})]);
 const t=(await db.pool.query("SELECT owner,received_at FROM freak_tickets WHERE campaign='prueba' AND number=5")).rows[0];assert.ok(Boolean(t.owner)!==Boolean(t.received_at),JSON.stringify({physical,digital,t}));assert.ok((physical.status===200&&digital.state==='received')||(physical.status===409&&digital.state==='owned'));
});
test('four-character access ignores case, rate limits an alias across IPs, and keeps old keys',async()=>{
 const created=await request('register',{method:'POST',body:{alias:'Acceso Corto'},who:'short',ip:'short-new'});assert.match(created.recovery,/^[A-HJ-NP-Z2-9]{4}$/);
 assert.equal((await request('login',{method:'POST',body:{alias:'ACCESO CORTO',recovery:created.recovery.toLowerCase()},who:'short2',ip:'short-login'})).status,200);
 assert.equal((await request('register',{method:'POST',body:{alias:'  ACCESO   CORTO  '},ip:'short-duplicate'})).status,409);
 assert.equal((await request('short-access',{method:'POST',body:{},ip:'short-anon'})).status,401);
 assert.equal((await request('short-access',{method:'POST',body:{},who:'short',ip:'short-repeat'})).status,409);
 const {scryptSync,randomUUID}=await import('node:crypto');const old='LegacySecretCaseSensitive24',salt='old-test-salt';
 await db.pool.query("INSERT INTO freak_people(id,campaign,alias,alias_key,salt,recovery_hash) VALUES($1,'prueba','Legacy User','legacy user',$2,$3)",[randomUUID(),salt,scryptSync(old,salt,64).toString('hex')]);
 assert.equal((await request('login',{method:'POST',body:{alias:'Legacy User',recovery:old},who:'legacy',ip:'legacy'})).status,200);
 const upgrade=await request('short-access',{method:'POST',body:{},who:'legacy',ip:'legacy'});assert.match(upgrade.recovery,/^[A-HJ-NP-Z2-9]{4}$/);
 assert.equal((await request('login',{method:'POST',body:{alias:'Legacy User',recovery:upgrade.recovery.toLowerCase()},who:'legacy2',ip:'legacy2'})).status,200);
 assert.equal((await request('login',{method:'POST',body:{alias:'Legacy User',recovery:old},who:'legacy3',ip:'legacy3'})).status,200);
 const attempts=await Promise.all(Array.from({length:6},(_,i)=>request('login',{method:'POST',body:{alias:'Unknown Alias',recovery:'ABCD'},ip:'distributed-'+i})));
 assert.equal(attempts.filter(r=>r.status===401).length,5);assert.equal(attempts.filter(r=>r.status===429).length,1);
 assert.equal((await request('admin-receive',{method:'POST',body:{code:'AB26',alias:'Different Collector'},who:'desk',ip:'duplicate-other'})).status,409);
});
test('simultaneous registrations cannot create duplicate normalized aliases',async()=>{
 const results=await Promise.all(['Nuevo Alias','  NUEVO   ALIAS  '].map((alias,i)=>request('register',{method:'POST',body:{alias},who:'aliasrace'+i,ip:'aliasrace'+i})));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal((await db.pool.query("SELECT count(*)::int AS n FROM freak_people WHERE campaign='prueba' AND alias_key='nuevo alias'")).rows[0].n,1);
});
