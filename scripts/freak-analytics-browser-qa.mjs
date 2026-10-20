// Isolated browser QA: independent in-memory DB; never uses production credentials.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {NetlifyDB} from '@netlify/database-dev';
import {getDatabase} from '@netlify/database';
import {chromium} from 'playwright';
import {createHandler} from '../netlify/functions/freak.mjs';
const engine=new NetlifyDB();let db,server,browser;
const output='output/freak-analytics-qa';await fs.mkdir(output,{recursive:true});
try{
 db=getDatabase({connectionString:await engine.start()});
 for(const f of (await fs.readdir('netlify/database/migrations')).filter(f=>f.includes('freak')&&!f.includes('inventory')).sort())await db.pool.query(await fs.readFile('netlify/database/migrations/'+f,'utf8'));
 const key=randomBytes(32).toString('base64url');await db.pool.query("UPDATE freak_admins SET key_hash=$1 WHERE id='owner'",[createHash('sha256').update(key).digest('hex')]);
 await db.pool.query("INSERT INTO freak_ticket_open_events(id,campaign,visitor,source,created_at) SELECT md5(('link-'||i)::text)::uuid,'freak-2026',md5('browser')::uuid,'boleto','2026-10-17 12:00:00.123456+00' FROM generate_series(1,451) i");
 await db.pool.query("INSERT INTO freak_poster_open_events(id,campaign,poster_id,visit,occupied,created_at) SELECT md5(('poster-'||i)::text)::uuid,'freak-2026','1',md5('session')::uuid,(i%2=0),'2026-10-17 12:00:00.987654+00' FROM generate_series(1,451) i");
 const handle=createHandler(db);
 server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/api/freak'){
    const chunks=[];for await(const c of req)chunks.push(c);const headers=new Headers(req.headers);if(req.headers.origin)headers.set('origin','https://bmoodcoffee.com');
    const r=await handle(new Request('https://bmoodcoffee.com'+url.pathname+url.search,{method:req.method,headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})}),{ip:'isolated-analytics-browser'});
    for(const [k,v]of r.headers)res.setHeader(k,v);res.writeHead(r.status);res.end(await r.text());return;
   }
   let file=path.resolve('.','.'+url.pathname);if(!file.startsWith(path.resolve('.')+path.sep)||!['freak','assets'].includes(path.relative('.',file).split(path.sep)[0]))throw Error('private');
   if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');
   const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png','.ttf':'font/ttf','.svg':'image/svg+xml','.woff2':'font/woff2'};
   res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));
  }catch{res.writeHead(404);res.end('Not found');}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 for(const suffix of ['?origen=boleto','?origen=anuncio','']){await p.goto(base+'/freak/'+suffix);await p.waitForTimeout(250);}
 await p.goto(base+'/freak/admin/rewards.html');await p.locator('#admin-key').fill(key);await p.locator('#login button').click();await p.locator('#ticket-metrics').getByText('Navegadores estimados').waitFor();
 assert.equal(await p.locator('#ticket-metrics strong').first().innerText(),'454');
 await p.locator('#analytics-source').selectOption('boleto');await p.locator('#analytics-filter button').click();await p.waitForTimeout(250);assert.equal(await p.locator('#ticket-metrics strong').first().innerText(),'452');
 await p.locator('#ticket-csv').evaluate(e=>e.closest('details').open=true);
 let download=await Promise.all([p.waitForEvent('download'),p.locator('#ticket-csv').click()]);await download[0].saveAs(output+'/enlaces.csv');let csv=await fs.readFile(output+'/enlaces.csv','utf8');assert.equal(csv.trim().split('\r\n').length,453);
 await p.locator('#analytics-from').fill('2026-10-17');await p.locator('#analytics-to').fill('2026-10-17');await p.locator('#analytics-filter button').click();await p.waitForTimeout(250);assert.equal(await p.locator('#ticket-metrics strong').first().innerText(),'451');
 await p.locator('#history-csv').evaluate(e=>e.closest('details').open=true);
 download=await Promise.all([p.waitForEvent('download'),p.locator('#history-csv').click()]);await download[0].saveAs(output+'/qr.csv');csv=await fs.readFile(output+'/qr.csv','utf8');assert.equal(csv.trim().split('\r\n').length,452);assert.ok(csv.includes('Guardado')&&csv.includes('Disponible'));
 await p.locator('#history-poster').selectOption('2');await p.locator('#history-filter button').click();await p.waitForTimeout(250);assert.ok((await p.locator('#scan-history').innerText()).includes('Sin aperturas'));
 await p.locator('#analytics-source').selectOption('all');await p.locator('#analytics-from').fill('');await p.locator('#analytics-to').fill('');await p.locator('#analytics-filter button').click();await p.waitForTimeout(250);
 await p.locator('#resumen').scrollIntoViewIfNeeded();await p.screenshot({path:output+'/desktop.png'});
 await p.setViewportSize({width:390,height:844});await p.locator('#boleto').scrollIntoViewIfNeeded();await p.screenshot({path:output+'/mobile.png'});
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow');assert.deepEqual(errors,[]);
 const report={checks:['454 aperturas / 3 fuentes','filtro boleto 452','fecha Puebla 451','CSV completo 452 enlaces y 451 QR','QR ocupado y disponible','filtro QR vacío','móvil 390 sin desborde','sin errores JS'],errors};
 await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();await new Promise(r=>server?.close(r)||r());await db?.pool.end();await engine.stop();}
