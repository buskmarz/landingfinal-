import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {NetlifyDB} from '@netlify/database-dev';
import {getDatabase} from '@netlify/database';
import {ticketAnalytics} from '../netlify/lib/freak-ticket-analytics.mjs';
import {rewardsAction} from '../netlify/lib/freak-rewards.mjs';
let engine,db;
const q=(sql,args)=>db.pool.query(sql,args),json=(body,status=200)=>({status,...body});
async function links(params='',admin=true){return ticketAnalytics({req:new Request('https://example.com/api/freak?'+params),q,campaign:'prueba',json,admin});}
async function opening(body){return ticketAnalytics({req:new Request('https://example.com/api/freak',{method:'POST'}),body,q,campaign:'prueba',json});}
async function posters(params='',admin=true){return rewardsAction({req:new Request('https://example.com/api/freak?'+params),op:'admin-scan-history',q,campaign:'freak-2026',json,admin});}
before(async()=>{
 engine=new NetlifyDB();db=getDatabase({connectionString:await engine.start()});
 for(const f of (await fs.readdir('netlify/database/migrations')).filter(f=>f.includes('freak')&&!f.includes('inventory')).sort())await q(await fs.readFile('netlify/database/migrations/'+f,'utf8'));
});
after(async()=>{await db?.pool.end();await engine?.stop();});
test('private source analytics preserves old ticket clients and deduplicates retries',async()=>{
 const visitor=randomUUID(),event=randomUUID();
 assert.equal((await links('',false)).status,401);
 for(let i=0;i<2;i++)assert.equal((await opening({visitor,event})).status,200);
 for(const source of ['anuncio','general'])assert.equal((await opening({visitor,event:randomUUID(),source})).status,200);
 assert.equal((await opening({visitor,event:randomUUID(),source:'inventado'})).status,400);
 const old=await links();assert.equal(old.totals.opens,1);assert.equal(old.events[0].source,'boleto');
 const all=await links('source=all');assert.equal(all.totals.opens,3);assert.equal(all.totals.browsers,1);assert.equal(all.sources.length,3);
 assert.ok(!JSON.stringify(all).includes(visitor));
 assert.equal((await links('source=anuncio')).totals.opens,1);
});
test('source analytics uses Puebla calendar boundaries and rejects invalid filters',async()=>{
 await q('DELETE FROM freak_ticket_open_events');
 const visitor=randomUUID();
 for(const at of ['2026-10-17T05:59:59.999999Z','2026-10-17T06:00:00Z','2026-10-18T05:59:59.999999Z','2026-10-18T06:00:00Z'])await q("INSERT INTO freak_ticket_open_events(id,campaign,visitor,source,created_at) VALUES($1,'prueba',$2,'anuncio',$3)",[randomUUID(),visitor,at]);
 const day=await links('source=anuncio&from=2026-10-17&to=2026-10-17');assert.equal(day.totals.opens,2);assert.equal(day.daily.length,1);assert.equal(day.daily[0].day,'2026-10-17');assert.equal(day.hourly.reduce((n,v)=>n+v.opens,0),2);
 assert.equal(day.timezone,'America/Mexico_City');
 await assert.rejects(links('from=2026-02-30'),/Fecha inválida/);
 await assert.rejects(links('from=2026-10-18&to=2026-10-17'),/rango/);
 await assert.rejects(links('cursor=invalid'),/Cursor inválido/);
});
test('compound cursor and snapshot export every row despite identical microsecond timestamps and new traffic',async()=>{
 await q('DELETE FROM freak_ticket_open_events');
 await q("INSERT INTO freak_ticket_open_events(id,campaign,visitor,source,created_at) SELECT md5(('event-'||i)::text)::uuid,'prueba',md5('browser')::uuid,'boleto','2026-10-20 12:00:00.123456+00' FROM generate_series(1,451) i");
 const first=await links();assert.equal(first.events.length,200);assert.equal(first.totals.opens,451);assert.ok(first.events.every(e=>e.created_at.includes('123456')));
 // An opening after the snapshot cannot move the export boundary.
 await opening({event:randomUUID(),visitor:randomUUID()});
 const rows=[...first.events];let cursor=first.next;
 while(cursor){const page=await links('snapshot='+encodeURIComponent(first.snapshot)+'&cursor='+cursor);assert.equal(page.totals.opens,451);rows.push(...page.events);cursor=page.next;}
 assert.equal(rows.length,451);assert.equal(new Set(rows.map(v=>v.id)).size,451);assert.equal((await links()).totals.opens,452);
});
test('five hidden QR history retains every opening, state, date filters and stable complete pagination',async()=>{
 await q("INSERT INTO freak_poster_open_events(id,campaign,poster_id,visit,occupied,created_at) SELECT md5(('poster-'||i)::text)::uuid,'freak-2026','1',md5('session')::uuid,(i%2=0),'2026-10-20 12:00:00.987654+00' FROM generate_series(1,451) i");
 await q("INSERT INTO freak_poster_open_events(id,campaign,poster_id,visit,occupied,created_at) VALUES($1,'freak-2026','2',$2,false,'2026-10-20 06:00:00+00')",[randomUUID(),randomUUID()]);
 await assert.rejects(posters('',false),/administración/);
 const filter='poster=1&from=2026-10-20&to=2026-10-20',first=await posters(filter),rows=[...first.events];let cursor=first.nextCursor;
 assert.equal(first.events.length,200);assert.ok(first.next);assert.ok(first.events.every(v=>v.poster_id==='1'&&v.created_at.includes('987654')));
 while(cursor){const page=await posters(filter+'&snapshot='+encodeURIComponent(first.snapshot)+'&cursor='+cursor);rows.push(...page.events);cursor=page.nextCursor;}
 assert.equal(rows.length,451);assert.equal(new Set(rows.map(v=>v.id)).size,451);assert.ok(rows.some(v=>v.occupied));assert.ok(rows.some(v=>!v.occupied));
 assert.equal((await posters('poster=2')).events.length,1);
 assert.equal((await posters('from=2026-10-21')).events.length,0);
 await assert.rejects(posters('cursor=invalid'),/Cursor inválido/);
});
