// Admin UI regression with intercepted local fixtures; no real identities or credentials.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:process.env.FREAK_QA_CHROMIUM||'/Users/macbookair2020/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const context=await browser.newContext({viewport:{width:360,height:800}}),page=await context.newPage(),errors=[],results=[];
let expired=false,validations=0,deliveries=0,delivered=false;
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept());
await context.route('**/api/freak?*',async route=>{
 const op=new URL(route.request().url()).searchParams.get('op');
 if(expired){await route.fulfill({status:401,json:{error:'Entra con tu clave de administración.'}});return;}
 if(op==='admin-validate-points'){validations++;await new Promise(r=>setTimeout(r,300));await route.fulfill({json:{ok:true,code:'ABCDEF987654',points:12}});return;}
 if(op==='admin-deliver-reward'){deliveries++;delivered=true;await new Promise(r=>setTimeout(r,300));await route.fulfill({json:{ok:true}});return;}
 await route.fulfill({json:{prizes:[{id:'1',title:'Premio local',claimed_at:'2026-10-19',delivered_at:delivered?'2026-10-19':null,display_name:'Participante Ficticio',phone:'+522221234567'}],validations:validations?[{display_name:'Participante Ficticio',phone:'+522221234567',normal_count:8,special_count:2}]:[]}});
});
async function check(name,work){await work();results.push(name);console.log('PASS '+name);}
try{
await page.goto('http://127.0.0.1:5196/freak/admin/rewards.html');await page.locator('#desk').waitFor({state:'visible'});
await check('admin mobile: initial zero prevents generating code',async()=>{assert.equal(await page.locator('#validate-submit').isDisabled(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);});
await page.locator('[name="name"]').fill('Participante Ficticio');await page.locator('[name="phone"]').fill('2221234567');
await check('nine points blocked; ten points still requires physical marking',async()=>{await page.locator('[name="normal"]').fill('9');assert.equal(await page.locator('#validate-submit').isDisabled(),true);await page.locator('[name="normal"]').fill('8');await page.locator('[name="special"]').fill('2');assert.match(await page.locator('#total').innerText(),/12 de 10/);assert.equal(await page.locator('#validate-submit').isDisabled(),true);await page.locator('[name="marked"]').check();assert.equal(await page.locator('#validate-submit').isDisabled(),false);});
await check('validation emits one code, shows actual points and identity, resets counters',async()=>{await page.locator('#validate-submit').click();assert.equal(await page.locator('#validate-submit').isDisabled(),true);await page.locator('#code-card').waitFor({state:'visible'});assert.equal(validations,1);assert.match(await page.locator('#notice').innerText(),/12 puntos/);assert.match(await page.locator('#code-person').innerText(),/Participante Ficticio/);assert.match(await page.locator('#code').innerText(),/ABCDEF987654/);assert.equal(await page.locator('#validate-submit').isDisabled(),true);assert.match(await page.locator('#total').innerText(),/0 de 10/);await page.screenshot({path:'output/freak-review/admin-mobile-code.png',fullPage:true});});
await check('delivery confirmation persists and removes second delivery action',async()=>{await page.locator('[data-deliver="1"]').click();await page.locator('.prize small').filter({hasText:'ENTREGADO'}).waitFor();assert.equal(deliveries,1);assert.equal(await page.locator('[data-deliver]').count(),0);});
await check('expired admin authorization removes private details and code from DOM',async()=>{expired=true;await page.locator('#refresh').click();await page.locator('#login').waitFor({state:'visible'});assert.equal(await page.locator('#desk').isVisible(),false);assert.equal(await page.locator('#code').innerText(),'');assert.equal(await page.locator('#code-person').innerText(),'');assert.equal(await page.locator('#prizes').innerText(),'');assert.equal(await page.locator('#validations').innerText(),'');assert.equal(await page.locator('[name="phone"]').inputValue(),'');assert.equal(await page.locator('[name="name"]').inputValue(),'');await page.screenshot({path:'output/freak-review/admin-session-expired.png',fullPage:true});});
await check('admin has no JavaScript errors',async()=>assert.deepEqual(errors,[]));
await fs.writeFile('output/freak-review/admin-results.json',JSON.stringify({at:new Date().toISOString(),results},null,2));
}finally{await browser.close();}
