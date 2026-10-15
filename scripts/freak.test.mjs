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
before(async()=>{engine=new NetlifyDB();const connectionString=await engine.start();db=getDatabase({connectionString});const exists=await db.pool.query("SELECT to_regclass('freak_campaigns') AS name");if(!exists.rows[0].name)await db.pool.query(await fs.readFile('netlify/database/migrations/20261015193000_freak.sql','utf8'));await db.pool.query(await fs.readFile('netlify/database/migrations/20261015213000_freak_admin.sql','utf8'));await db.pool.query('DELETE FROM freak_tickets');for(let i=0;i<4;i++)await db.pool.query('INSERT INTO freak_tickets(campaign,number,token_hash,act,rare,release_at) VALUES($1,$2,$3,$4,$5,$6)',['prueba',i+1,createHash('sha256').update(tokens[i]).digest('hex'),i===1?3:i===3?0:i,i===1,i===2?'2099-01-01':'2026-01-01']);handler=createHandler(db)});
after(async()=>{await db?.pool.end();await engine?.stop()});
test('GET inspection never assigns a ticket; invalid and locked states',async()=>{assert.equal((await request('ticket',{token:tokens[0]})).state,'available');assert.equal((await request('ticket',{token:tokens[0]})).state,'available');assert.equal((await request('ticket',{token:tokens[2]})).state,'unreleased');assert.equal((await request('ticket',{token:'x'.repeat(43)})).status,404);});
test('register recoverable aliases and protect sessions',async()=>{for(const who of ['A','B']){const r=await request('register',{method:'POST',body:{alias:`Artista ${who}`},who});assert.equal(r.status,200);assert.ok(r.recovery.length>=24);recovery[who]=r.recovery;assert.ok(cookies[who].includes('__Secure-freak='));}assert.equal((await request('register',{method:'POST',body:{alias:'artista a'},who:'duplicate'})).status,409);assert.equal((await request('claim',{method:'POST',body:{token:tokens[0]}})).status,401);assert.equal((await request('register',{method:'POST',body:{alias:'closed'},campaign:'freak-2026'})).status,423);});
test('two users racing one QR yields one global owner; retry is idempotent',async()=>{const results=await Promise.all(['A','B'].map(who=>request('claim',{method:'POST',body:{token:tokens[0]},who})));assert.deepEqual(results.map(r=>r.state).sort(),['occupied','owned']);const winner=results[0].state==='owned'?'A':'B';assert.equal((await request('claim',{method:'POST',body:{token:tokens[0]},who:winner})).state,'owned');const {rows}=await db.pool.query('SELECT count(*)::int AS n FROM freak_tickets WHERE owner IS NOT NULL');assert.equal(rows[0].n,1);});
test('rare claim, persistent collection, total and rare tie breakers',async()=>{const r=await request('claim',{method:'POST',body:{token:tokens[1]},who:'B'});assert.equal(r.state,'owned');assert.equal(r.ticket.rare,true);const state=await request('state',{who:'B'});assert.ok(state.owned.some(t=>t.rare));assert.equal(state.ranking[0].alias,'Artista B');assert.ok(!JSON.stringify(state).includes('token_hash'));assert.equal((await request('claim',{method:'POST',body:{token:tokens[2]},who:'A'})).state,'unreleased');});
test('recovery in a new session restores the server collection',async()=>{cookies.C='';const login=await request('login',{method:'POST',body:{alias:'Artista B',recovery:recovery.B},who:'C'});assert.equal(login.status,200);assert.deepEqual((await request('state',{who:'C'})).owned,(await request('state',{who:'B'})).owned);assert.equal((await request('login',{method:'POST',body:{alias:'Artista B',recovery:'wrong'.repeat(5)},who:'D'})).status,401);});
test('campaign isolation, CSRF, GET claim rejection and logout',async()=>{assert.equal((await request('state',{who:'C',campaign:'freak-2026'})).person,null);assert.equal((await request('claim',{token:tokens[3],who:'C'})).status,405);assert.equal((await request('claim',{method:'POST',body:{token:tokens[3]},who:'C',origin:'https://evil.example'})).status,403);assert.equal((await request('logout',{method:'POST',body:{},who:'C'})).status,200);assert.equal((await request('state',{who:'C'})).person,null);});
test('rate limiter atomically blocks writes beyond limit',async()=>{const attempts=await Promise.all(Array.from({length:31},()=>request('login',{method:'POST',body:{alias:'nonexistent',recovery:'short'},ip:'rate-test'})));assert.equal(attempts.filter(r=>r.status===429).length,1);});
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
