// Browser regression workflow: runs only against the isolated local QA server.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const base='http://127.0.0.1:5196';
const fixture=JSON.parse(await fs.readFile('output/freak-review/local-fixture.json','utf8'));
const browser=await chromium.launch({headless:true,executablePath:process.env.FREAK_QA_CHROMIUM||'/Users/macbookair2020/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const results=[];
const qaPhone='222'+String(Date.now()).slice(-7);
async function check(name,work){await work();results.push(name);console.log('PASS '+name);}
const errors=[];
try{
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'/freak/');await page.locator('.prize').first().waitFor();
const choice=await page.locator('.prize button:enabled').first().getAttribute('data-prize');
const alternative=await page.locator('.prize button:enabled').nth(1).getAttribute('data-prize');
assert.ok(choice&&alternative,'Use a new local QA database if fewer than two prizes remain.');
await check('mobile 390: no horizontal overflow, rules and point values visible',async()=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.match(await page.locator('.points').innerText(),/10 puntos/);assert.match(await page.locator('.rule').innerText(),/sin QR/);});
await page.screenshot({path:'output/freak-review/mobile.png',fullPage:true});
await check('without poster no claim form or reservation',async()=>{await page.locator('[data-prize="'+choice+'"]').click();assert.match(await page.locator('#message').innerText(),/escanea/);assert.equal(await page.locator('#claim-form').isVisible(),false);});
await page.locator('#access-name').fill('Prueba Navegador');await page.locator('#access-phone').fill(qaPhone);
await check('manual refresh keeps access input values',async()=>{await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);assert.equal(await page.locator('#access-name').inputValue(),'Prueba Navegador');assert.equal(await page.locator('#access-phone').inputValue(),qaPhone);});
await page.goto(base+'/freak/#premio='+fixture.poster);await page.locator('.prize').first().waitFor();
await page.locator('[data-prize="'+choice+'"]').click();await page.locator('#access-name').fill('Prueba Navegador');await page.locator('#access-phone').fill(qaPhone);
await check('register with a selection opens confirmation and leaves prize controls usable',async()=>{await page.locator('[value="register"]').click();await page.locator('#bar-code').waitFor({state:'visible'});assert.equal(await page.locator('[data-prize="'+alternative+'"]').isDisabled(),false);assert.match(await page.locator('.points-status').innerText(),/Meta: 10 puntos/);});
await check('cancel changes selection and removes private code input',async()=>{await page.locator('#bar-code').fill('123456ABCDEF');await page.locator('#cancel-selection').click();assert.equal(await page.locator('#claim-form').isVisible(),false);assert.equal(await page.locator('#bar-code').inputValue(),'');});
await check('server rejects canje without physically validated points',async()=>{await page.locator('[data-prize="'+choice+'"]').click();await page.locator('#bar-code').fill('123456ABCDEF');await page.locator('#claim-form button[type="submit"]').click();await page.waitForFunction(()=>!document.querySelector('#claim-form button[type="submit"]').disabled);assert.match(await page.locator('#message').innerText(),/valida tus 10 puntos/);});
const adminContext=await browser.newContext();const adminPage=await adminContext.newPage();adminPage.on('pageerror',e=>errors.push(e.message));
await adminPage.goto(base+'/freak/admin/rewards.html');await adminPage.locator('[name="key"]').fill(fixture.admin);await adminPage.locator('#login button').click();await adminPage.locator('#desk').waitFor({state:'visible'});
await adminPage.locator('[name="name"]').fill('Prueba Navegador');await adminPage.locator('[name="phone"]').fill(qaPhone);await adminPage.locator('[name="normal"]').fill('6');await adminPage.locator('[name="special"]').fill('2');await adminPage.locator('[name="marked"]').check();await adminPage.locator('#validate button').click();
await adminPage.waitForFunction(()=>/^[A-F0-9]{12}$/.test(document.querySelector('#code').textContent));
const code=(await adminPage.locator('#code').innerText()).match(/[A-F0-9]{12}/)[0];
await page.locator('#cancel-selection').click();await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
await check('validated progress comes from server, survives reload',async()=>{assert.match(await page.locator('.points-status').innerText(),/10 puntos validados/);await page.reload();await page.locator('.points-status').waitFor();assert.match(await page.locator('.points-status').innerText(),/10 puntos validados/);});
await page.locator('[data-prize="'+choice+'"]').click();await page.locator('#bar-code').fill(code);
await check('single confirmation reserves prize, persisted after reload, logout still available',async()=>{await page.locator('#claim-form button[type="submit"]').click();await page.locator('.account-card').waitFor();assert.match(await page.locator('.account-card').innerText(),/PREMIO CONFIRMADO/);await page.reload();await page.locator('.account-card').waitFor();assert.equal(await page.locator('[data-prize="'+alternative+'"]').isDisabled(),true);assert.equal(await page.locator('#logout').isVisible(),true);});
await page.screenshot({path:'output/freak-review/mobile-confirmed.png',fullPage:true});
await check('logout clears personal confirmation and restores access form',async()=>{await page.locator('#logout').click();await page.locator('#access').waitFor();assert.equal(await page.locator('.account-card').count(),0);assert.equal(await page.locator('[data-prize="'+alternative+'"]').isDisabled(),false);});
await adminContext.close();await context.close();
for(const width of [320,360,768,1440]){
const p=await browser.newPage({viewport:{width,height:1000}});await p.goto(base+'/freak/');await p.locator('.prize').first().waitFor();await check(`layout ${width}: no horizontal overflow`,async()=>assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true));await p.screenshot({path:`output/freak-review/layout-${width}.png`,fullPage:true});await p.close();
}
assert.deepEqual(errors,[]);results.push('No browser JavaScript errors');
await fs.writeFile('output/freak-review/browser-results.json',JSON.stringify({at:new Date().toISOString(),results},null,2));
}finally{await browser.close();}
