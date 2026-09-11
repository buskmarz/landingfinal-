import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium,webkit} from 'playwright';

// Browser plugin not available. All HTTP responses are isolated from production.
const root=process.cwd(),evidence='/private/tmp/bmc-enrollment-flow';
await mkdir(evidence,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch({headless:true});
  try{
    for(const [device,viewport] of Object.entries({desktop:{width:1440,height:1000},tablet:{width:820,height:1180},mobile:{width:390,height:844}})){
      const context=await browser.newContext({viewport}),page=await context.newPage();
      const calls=[],errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',async route=>{
        const request=route.request(),url=new URL(request.url());
        if(url.pathname.includes('loyalty-enrollment-auth')){
          if(request.method()==='GET')return route.fulfill({json:{emailVerificationRequired:true,registrationAvailable:true,hybridProgramActive:true}});
          const body=request.postDataJSON();calls.push(body);
          const responses={request:{challengeId:'isolated-challenge'},verify:{emailProof:'isolated-proof'},register:{status:'ready'}};
          return route.fulfill({json:responses[body.action]});
        }
        if(url.pathname.endsWith('/loyalty-portal'))return route.fulfill({json:{ok:true,token:'isolated-token',customer:{customer:{name:'Registro aislado'},profile:{loyaltyProgram:'hybrid',availableCashbackBalance:0,currentProgressVisits:0,visitsPerReward:6},wallet:{passes:[]}}}});
        if(url.hostname!=='bmood.test')return route.fulfill({status:204,body:''});
        const file=resolve(root,`.${decodeURIComponent(url.pathname.endsWith('/')?`${url.pathname}index.html`:url.pathname)}`);
        if(!file.startsWith(root+'/'))return route.abort();
        try{return route.fulfill({body:await readFile(file),contentType:types[extname(file)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}
      });
      await page.goto('https://bmood.test/recompensas/');
      const form=page.locator('[data-enrollment-form]');await form.waitFor();
      assert.equal(await page.locator('#rewards-title').textContent(),'5% de cashback + una bebida gratis al completar 6 sellos.');
      assert.equal(await page.locator('#how-title').textContent(),'Cómo se acumulan tus beneficios.');
      assert.equal(await page.locator('.rewards-how__steps article').nth(1).locator('p').textContent(),'Cada compra elegible genera 5% de cashback y un sello por cliente, día y sucursal.');
      assert.equal(await page.locator('[data-portal-form]').isVisible(),false);
      assert.equal(await form.locator('[name=marketingAccepted]').isChecked(),false);
      await form.locator('[name=name]').fill('Registro aislado');
      await form.locator('[name=phone]').fill('222 123 4567');
      await form.locator('[name=email]').fill('isolated@example.test');
      await form.locator('[name=birthdayDay]').fill('29');
      await form.locator('[name=birthdayMonth]').selectOption('2');
      await form.locator('[name=privacyAccepted]').check();
      await form.locator('[data-enrollment-submit]').click();
      await form.locator('[name=code]:enabled').waitFor();
      await form.locator('[name=code]').fill('123456');
      await form.locator('[data-enrollment-submit]').click();
      await page.locator('[data-portal-results]:not([hidden])').waitFor();
      const registration=calls.find(row=>row.action==='register');
      assert.equal(registration.enrollment.phone,'+522221234567');
      assert.equal(registration.enrollment.birthdayDay,29);
      assert.equal(registration.enrollment.birthdayMonth,2);
      assert.equal(registration.enrollment.privacyAccepted,true);
      assert.equal(registration.enrollment.marketingAccepted,false);
      assert.equal(calls.filter(row=>row.action==='register').length,1);
      assert.equal(await page.evaluate(()=>localStorage.getItem('bmood_rewards_portal_token')),null);
      await page.locator('[data-enrollment-signout]').click();
      await form.waitFor();
      assert.equal(await page.locator('[data-portal-results]').isVisible(),false);
      assert.equal(await form.locator('[name=code]').isEnabled(),false);
      assert.equal(await form.locator('[name=email]').inputValue(),'');
      await form.locator('[name=mode][value=login]').check();
      assert.equal(await form.locator('[name=name]').isEnabled(),false);
      assert.equal(await form.locator('[name=privacyAccepted]').isEnabled(),false);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await form.screenshot({path:`${evidence}/${name}-${device}.png`});
      assert.deepEqual(errors,[]);
      await context.close();
      console.log(`PASS ${name}/${device}: registration, birthday, separate consent, verified session, logout and login mode`);
    }
  }finally{await browser.close();}
}
console.log('Isolated enrollment UI only: no real email, customer creation or Wallet installation.');
