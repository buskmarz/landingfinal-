// End-to-end launch QA against a temporary database. No real QR or account used.
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
const output='output/freak-launch-browser-qa',checks=[],errors=[];
const hash=v=>createHash('sha256').update(v).digest('hex');
const fixtureName='Persona de Prueba',fixturePhone='2221234567',fixturePin='493817';
await fs.mkdir(output,{recursive:true});
const passed=name=>{checks.push(name);console.log('PASS '+name);};
async function openDetails(locator){await locator.evaluate(e=>{let p=e.closest('details');while(p){p.open=true;p=p.parentElement?.closest('details');}});}
async function noOverflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
try{
 db=getDatabase({connectionString:await engine.start()});db.pool.options.max=1;
 for(const f of (await fs.readdir('netlify/database/migrations')).filter(f=>f.includes('freak')&&!f.includes('inventory')).sort())await db.pool.query(await fs.readFile('netlify/database/migrations/'+f,'utf8'));
 const adminKey=randomBytes(32).toString('base64url'),poster=randomBytes(32).toString('base64url');
 await db.pool.query("UPDATE freak_admins SET key_hash=$1 WHERE id='owner'",[hash(adminKey)]);
 await db.pool.query("UPDATE freak_rewards SET poster_hash=$1 WHERE campaign='freak-2026' AND id='1'",[hash(poster)]);
 const handle=createHandler(db),root=path.resolve('.');
 server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/api/freak'){
    const chunks=[];for await(const c of req)chunks.push(c);const headers=new Headers(req.headers);if(req.headers.origin)headers.set('origin','https://bmoodcoffee.com');
    const r=await handle(new Request('https://bmoodcoffee.com'+url.pathname+url.search,{method:req.method,headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})}),{ip:'isolated-launch-'+url.searchParams.get('op')});
    for(const [k,v]of r.headers)res.setHeader(k,v);res.writeHead(r.status);res.end(await r.text());return;
   }
   let file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)||!['freak','assets','privacidad'].includes(path.relative(root,file).split(path.sep)[0]))throw Error('private');
   if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');
   const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png','.jpeg':'image/jpeg','.ttf':'font/ttf','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2'};
   res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));
  }catch{res.writeHead(404);res.end('Not found');}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({channel:'chrome',headless:true});
 const mobile=await browser.newContext({viewport:{width:390,height:844}}),guest=await browser.newContext({viewport:{width:390,height:844}}),adminContext=await browser.newContext({viewport:{width:1280,height:900}});
 const person=await mobile.newPage(),other=await guest.newPage(),admin=await adminContext.newPage();
 for(const p of [person,other,admin])p.on('pageerror',e=>errors.push(e.message));
 admin.on('dialog',dialog=>dialog.accept());
 await person.goto(base+'/freak/qr/#premio='+poster);await person.getByText('Quedan 5 de 5 QR disponibles. ¡Búscalos!',{exact:true}).waitFor();
 await person.locator('.discovery-confetti').waitFor();assert.ok(await person.locator('.discovery-confetti i').count()>0);
 await person.locator('#access-name').fill(fixtureName);await person.locator('#access-phone').fill(fixturePhone);await person.locator('#access-pin').fill(fixturePin);
 await person.locator('#access button[value="register"]').click();await person.getByRole('heading',{name:'¡QR guardado!'}).waitFor();await person.getByText('Quedan 4 de 5 QR disponibles. ¡Búscalos!',{exact:true}).waitFor();await noOverflow(person);
 passed('Móvil390: registro con PIN secreto, confeti y reserva5→4');
 await other.goto(base+'/freak/qr/#premio='+poster);await other.getByRole('heading',{name:'Este QR ya fue guardado'}).waitFor();await other.reload();await other.getByRole('heading',{name:'Este QR ya fue guardado'}).waitFor();
 passed('Otro navegador: QR ocupado y dos aperturas posteriores contadas');
 await admin.goto(base+'/freak/admin/rewards.html');await admin.locator('#admin-key').fill(adminKey);await admin.locator('#login button').click();await admin.locator('#desk').waitFor({state:'visible'});await admin.locator('[data-location="1"] input').waitFor();
 await admin.locator('[data-location="1"] input').fill('PRUEBA: poste cerca de UPAEP');await admin.locator('[data-location="1"] button').click();await admin.getByText('Ubicación guardada.',{exact:true}).waitFor();await admin.reload();await admin.locator('[data-location="1"] input').waitFor();assert.equal(await admin.locator('[data-location="1"] input').inputValue(),'PRUEBA: poste cerca de UPAEP');
 const opens=(await db.pool.query("SELECT occupied FROM freak_poster_open_events WHERE campaign='freak-2026' AND poster_id='1' ORDER BY created_at")).rows;assert.deepEqual(opens.map(r=>r.occupied),[false,true,true]);
 passed('Administración: acceso, ubicación persistida e historial disponible/ocupado');
 await admin.locator('#registered-name').fill(fixtureName);await admin.locator('#registered-phone').fill(fixturePhone);await admin.locator('#normal-count').fill('6');await admin.locator('#special-count').fill('2');await admin.locator('#validate [name="marked"]').check();
 assert.equal(await admin.locator('#total').innerText(),'10 de 10 puntos');await admin.locator('#validate-submit').click();await admin.getByText('10 puntos comprobados. Ya puede elegir su premio desde su cuenta.',{exact:true}).waitFor();
 await openDetails(person.locator('#refresh'));await person.locator('#refresh').click();await person.locator('.points-status strong').filter({hasText:'10 puntos comprobados'}).waitFor();
 const choice=person.locator('[data-prize="4"]');await openDetails(choice);await choice.click();await person.locator('#claim-form button[type="submit"]').click();await person.getByText('PREMIO CONFIRMADO',{exact:true}).waitFor();await person.reload();await person.getByText('PREMIO CONFIRMADO',{exact:true}).waitFor();assert.match(await person.locator('.account-card').innerText(),/5 chilaquiles/);
 passed('Diez puntos físicos:6normales+2carpas; elección libre y premio persistido');
 await admin.locator('#refresh').click();await admin.locator('[data-deliver="4"]').click();await admin.getByText('Entrega registrada.',{exact:true}).waitFor();await admin.reload();await admin.locator('#desk').waitFor({state:'visible'});assert.equal(await admin.locator('[data-deliver="4"]').count(),0);assert.equal(await admin.locator('#prizes .prize').filter({hasText:'5 chilaquiles'}).locator('small').innerText(),'ENTREGADO');
 await person.reload();await person.getByText('ENTREGA REGISTRADA',{exact:true}).waitFor();
 passed('Entrega registrada: persiste en administración y en cuenta');
 await other.goto(base+'/freak/qr/');await other.locator('#access-phone').fill(fixturePhone);await other.locator('#access-pin').fill(fixturePin);await other.locator('#access button[value="login"]').click();await other.getByText('ENTREGA REGISTRADA',{exact:true}).waitFor();
 const reset=admin.locator('#reset-pin');await openDetails(reset);await reset.locator('[name="name"]').fill(fixtureName);await reset.locator('[name="phone"]').fill(fixturePhone);await reset.locator('[name="confirmed"]').check();await reset.locator('button').click();await admin.locator('#pin-card').waitFor({state:'visible'});const newPin=await admin.locator('#pin-value').innerText();assert.match(newPin,/^\d{8}$/);assert.notEqual(newPin,fixturePin);
 assert.equal((await db.pool.query("SELECT count(*)::int AS n FROM freak_sessions WHERE person=(SELECT id FROM freak_people WHERE campaign='freak-2026' AND phone=$1)",['+52'+fixturePhone])).rows[0].n,0);
 await person.reload();await person.locator('#access-pin').waitFor();await other.reload();await other.locator('#access-pin').waitFor();
 await person.locator('#access-phone').fill(fixturePhone);await person.locator('#access-pin').fill(fixturePin);await person.locator('#access button[value="login"]').click();await person.locator('#message').filter({hasText:'Celular o PIN incorrectos.'}).waitFor();assert.equal(await person.locator('#access-pin').isVisible(),true);
 await person.locator('#access-pin').fill(newPin);await person.locator('#access button[value="login"]').click();await person.getByText('ENTREGA REGISTRADA',{exact:true}).waitFor();
 passed('PIN administrativo8dígitos: revoca2sesiones, anteriorrechazado, nuevoválido');
 await admin.reload();await admin.locator('#desk').waitFor({state:'visible'});await admin.locator('#ticket-metrics strong').first().waitFor();assert.equal(await admin.locator('#pin-value').innerText(),'');await admin.evaluate(()=>document.fonts.ready);await admin.waitForFunction(()=>getComputedStyle(document.querySelector('#resumen')).opacity==='1');await admin.evaluate(()=>window.scrollTo(0,0));await admin.screenshot({path:output+'/admin-desktop.png'});
 await admin.setViewportSize({width:390,height:844});await noOverflow(admin);await admin.evaluate(()=>window.scrollTo(0,0));await admin.screenshot({path:output+'/admin-mobile.png'});await person.evaluate(()=>window.scrollTo(0,0));await person.screenshot({path:output+'/participant-mobile.png'});
 assert.deepEqual(errors,[]);passed('Capturas finales sin claves; móvil390 sin desborde ni erroresJavaScript');
 await fs.writeFile(output+'/report.json',JSON.stringify({at:new Date().toISOString(),checks,errors,productionTouched:false},null,2));
 console.log(JSON.stringify({passed:checks.length,errors:errors.length,productionTouched:false}));
}finally{await browser?.close();await new Promise(r=>server?.close(r)||r());await db?.pool.end();await engine.stop();}
