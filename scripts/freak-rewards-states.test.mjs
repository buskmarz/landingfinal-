// UI-only adversarial states. All API responses are intercepted fixtures, never live data.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:process.env.FREAK_QA_CHROMIUM||'/Users/macbookair2020/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const results=[];
const base='http://127.0.0.1:5196',poster='L'.repeat(43);
const prizes=[{id:'1',title:'Premio local A',taken:false},{id:'2',title:'Premio local B',taken:false}];
let snapshot={prizes,person:null,validation:null,mine:null},fail=false,claimCalls=0,delay=0,claimMode='conflict';
const context=await browser.newContext({viewport:{width:360,height:800}});
await context.route('**/api/freak?*',async route=>{
 const op=new URL(route.request().url()).searchParams.get('op');
 if(delay)await new Promise(r=>setTimeout(r,delay));
 if(fail){await route.abort('failed');return;}
 if(op==='reward-claim'&&claimMode==='committed-offline'){claimCalls++;snapshot={...snapshot,mine:{id:'2',title:'Premio local B',delivered_at:null},prizes:prizes.map(p=>({...p,taken:p.id==='2'}))};await route.abort('failed');return;}
 if(op==='reward-claim'){claimCalls++;snapshot={...snapshot,prizes:[{...prizes[0],taken:true},prizes[1]]};await route.fulfill({status:409,json:{error:'Alguien eligió ese premio. Puedes escoger otro disponible.'}});return;}
 await route.fulfill({status:200,json:structuredClone(snapshot)});
});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function check(name,work){await work();results.push(name);console.log('PASS '+name);}
try{
await page.goto(base+'/freak/');await page.locator('.prize').first().waitFor();
await check('failed refresh keeps typed access data and allows retry',async()=>{
 await page.locator('#access-name').fill('Persona de prueba');await page.locator('#access-phone').fill('2221234567');fail=true;
 await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
 assert.match(await page.locator('#message').innerText(),/conexión/);assert.equal(await page.locator('#access-phone').inputValue(),'2221234567');
 fail=false;await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);assert.match(await page.locator('#prize-status').innerText(),/2 premios/);
});
await check('empty configuration is distinct from exhausted inventory',async()=>{snapshot={...snapshot,prizes:[]};await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);assert.match(await page.locator('#prize-status').innerText(),/aún no están/);snapshot={...snapshot,prizes:prizes.map(p=>({...p,taken:true}))};await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);assert.match(await page.locator('#prize-status').innerText(),/Todos/);assert.equal(await page.locator('.prize button:enabled').count(),0);await page.screenshot({path:'output/freak-review/empty-prizes.png',fullPage:true});});
await check('one remaining prize uses singular and taken label never relies only on color',async()=>{snapshot={...snapshot,prizes:[{...prizes[0],taken:true},prizes[1]]};await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);assert.equal(await page.locator('#prize-status').innerText(),'Queda 1 premio disponible.');assert.match(await page.locator('.taken').innerText(),/YA ELEGIDO/);});
snapshot={prizes,person:{name:'Persona QA <script>oops</script>'},validation:{points:10},mine:null};await page.goto(base+'/freak/#premio='+poster);await page.locator('.points-status').waitFor();
await check('server content renders as text without executable HTML',async()=>{assert.equal(await page.locator('#account script').count(),0);assert.match(await page.locator('.account-header').innerText(),/<script>/);});
await check('section navigation keeps scanned poster; explicit fragment removal clears code and selection',async()=>{await page.locator('[data-prize="1"]').click();await page.locator('#bar-code').fill('ABCDEF123456');await page.locator('header a[href="#premios"]').click();assert.equal(await page.locator('#claim-form').isVisible(),true);assert.match(page.url(),/#premio=/);await page.evaluate(()=>{location.hash='premios'});await page.locator('#claim-form').waitFor({state:'hidden'});assert.equal(await page.locator('#bar-code').inputValue(),'');assert.equal(await page.locator('.prize.selected').count(),0);await page.locator('[data-prize="2"]').click();assert.match(await page.locator('#message').innerText(),/escanea/);assert.equal(claimCalls,0);});
await page.goto(base+'/freak/#premio='+poster);await page.locator('.points-status').waitFor();
await check('concurrent winner clears stale selection, prevents repeat submission and lets user choose another',async()=>{await page.locator('[data-prize="1"]').click();await page.locator('#bar-code').fill('ABCDEF123456');delay=350;await page.locator('#claim-form button[type="submit"]').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);delay=0;assert.equal(claimCalls,1);assert.equal(await page.locator('#claim-form').isVisible(),false);assert.equal(await page.locator('#bar-code').inputValue(),'');assert.equal(await page.locator('[data-prize="1"]').isDisabled(),true);assert.equal(await page.locator('[data-prize="2"]').isDisabled(),false);await page.locator('[data-prize="2"]').click();assert.equal(await page.locator('#claim-form').isVisible(),true);assert.match(await page.locator('#selection').innerText(),/local B/);await page.screenshot({path:'output/freak-review/race-recovery.png',fullPage:true});});
await check('lost response after successful commit recovers confirmed prize from server without second POST',async()=>{claimMode='committed-offline';const before=claimCalls;await page.locator('#bar-code').fill('ABCDEF123456');await page.locator('#claim-form button[type="submit"]').click();await page.locator('.account-card').waitFor();assert.match(await page.locator('#message').innerText(),/reserva quedó guardada/);assert.equal(claimCalls,before+1);assert.equal(await page.locator('#claim-form').isVisible(),false);assert.equal(await page.locator('#logout').isVisible(),true);await page.screenshot({path:'output/freak-review/interrupted-confirmation.png',fullPage:true});});
await check('public refresh does not replace focused access form after background polling',async()=>{snapshot={prizes,person:null,validation:null,mine:null};await page.goto(base+'/freak/');await page.locator('#access').waitFor();await page.locator('#access-name').fill('Conservar borrador');await page.locator('#access-phone').fill('2227654321');await page.clock.install();await page.clock.fastForward(21000);assert.equal(await page.locator('#access-name').inputValue(),'Conservar borrador');assert.equal(await page.locator('#access-phone').inputValue(),'2227654321');await page.clock.resume();});
await check('no JavaScript errors in adversarial states',async()=>assert.deepEqual(errors,[]));
await fs.writeFile('output/freak-review/states-results.json',JSON.stringify({at:new Date().toISOString(),results},null,2));
}finally{await browser.close();}
