import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium,webkit} from 'playwright';

// Automated regression fixture: all HTTP responses are isolated from production.
const root=process.cwd(),evidence='/private/tmp/bmc-enrollment-flow';
await mkdir(evidence,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch({headless:true});
  try{
    for(const [device,viewport] of Object.entries({desktop:{width:1440,height:1000},tablet:{width:820,height:1180},mobile:{width:390,height:844}})){
      const context=await browser.newContext({viewport}),page=await context.newPage();
      const calls=[],errors=[];
      let pendingLink=false,walletFailure=true;
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',async route=>{
        const request=route.request(),url=new URL(request.url());
        if(url.pathname.includes('loyalty-enrollment-auth')){
          if(request.method()==='GET')return route.fulfill({json:{emailVerificationRequired:true,registrationAvailable:true,hybridProgramActive:true}});
          const body=request.postDataJSON();calls.push(body);
          if(body.action==='verify'&&body.code==='000000') return route.fulfill({status:401,json:{error:'Código inválido o vencido.'}});
          if(body.action==='register'&&pendingLink) return route.fulfill({json:{status:'staff_link_required'}});
          const responses={request:{challengeId:'isolated-challenge'},verify:{emailProof:'isolated-proof'},register:{status:'ready'}};
          return route.fulfill({json:responses[body.action]});
        }
        if(url.pathname.endsWith('/loyalty-portal')&&request.method()==='POST'){
          const body=request.postDataJSON();
          if(body.action?.startsWith('issue_')){
            calls.push(body);assert.equal(body.token,'isolated-token');
            if(walletFailure){walletFailure=false;return route.fulfill({status:503,json:{error:'Tarjeta temporalmente no disponible. Intenta de nuevo.'}});}
            return route.fulfill({json:{ok:true,installUrl:`https://bmood.test/wallet-test/${body.action}`}});
          }
        }
        if(url.pathname.startsWith('/wallet-test/')) return route.fulfill({contentType:'text/html',body:'<h1>Destino Wallet de prueba</h1>'});
        if(url.pathname.endsWith('/loyalty-portal')&&pendingLink) return route.fulfill({status:409,json:{code:'account_not_linked',error:'Activa tu acceso para continuar.'}});
        if(url.pathname.endsWith('/loyalty-portal'))return route.fulfill({json:{ok:true,token:'isolated-token',customer:{customer:{name:'Registro aislado'},profile:{loyaltyProgram:'hybrid',availableCashbackBalance:0,currentProgressVisits:0,visitsPerReward:6},wallet:{passes:[]}}}});
        if(url.hostname!=='bmood.test')return route.fulfill({status:204,body:''});
        const file=resolve(root,`.${decodeURIComponent(url.pathname.endsWith('/')?`${url.pathname}index.html`:url.pathname)}`);
        if(!file.startsWith(root+'/'))return route.abort();
        try{return route.fulfill({body:await readFile(file),contentType:types[extname(file)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}
      });
      await page.goto('https://bmood.test/recompensas/');
      const form=page.locator('[data-enrollment-form]');await form.waitFor();
      assert.equal(await page.locator('#rewards-title').textContent(),'Rewards');
      assert.equal(await page.locator('#how-title').textContent(),'Tu café. Más beneficios.');
      assert.equal(await page.locator('.rewards-how__steps article').nth(1).locator('p').textContent(),'Un sello por día y sucursal con compra elegible. Tú eliges de la selección vigente.');
      assert.equal(await page.locator('[data-portal-form]').isVisible(),false);
      assert.equal(await form.locator('[name=marketingAccepted]').isChecked(),false);
      await form.locator('[name=mode][value=register]').check();
      await form.locator('[name=name]').fill('Registro aislado');
      assert.equal(await form.locator('[name=countryCode]').inputValue(),'52');
      const expectedPhone=device==='tablet'?'+12221234567':device==='mobile'?'+447700900123':'+522221234567';
      if(device==='tablet')await form.locator('[name=countryCode]').selectOption('1');
      if(device==='mobile'){
        await form.locator('[name=countryCode]').selectOption('other');
        await form.locator('[name=customCountryCode]').fill('+44');
      }
      await form.locator('[name=phone]').fill(device==='mobile'?'7700900123':device==='desktop'?'+52 222 123 4567':'2221234567');
      await form.locator('[name=email]').fill('isolated@example.test');
      const withBirthday=device==='desktop';
      assert.equal(await form.locator('[name=birthdayDay]').getAttribute('required'),null);
      if(withBirthday){
        await form.locator('[name=birthdayDay]').fill('29');
        await form.locator('[name=birthdayMonth]').selectOption('2');
      }else{
        // A partially entered birthday must fail locally before an email is sent.
        await form.locator('[name=birthdayDay]').fill('12');
        await form.locator('[name=privacyAccepted]').check();
        await form.locator('[data-enrollment-submit]').click();
        await page.getByText('Completa el día y mes de nacimiento, o deja ambos en blanco.',{exact:true}).waitFor();
        assert.equal(calls.length,0);
        await form.locator('[name=birthdayDay]').fill('');
      }
      await form.locator('[name=privacyAccepted]').check();
      await form.locator('[data-enrollment-submit]').click();
      await form.locator('[name=code]:enabled').waitFor();
      await form.locator('[name=code]').fill('123456');
      await form.locator('[data-enrollment-submit]').click();
      await page.locator('[data-portal-results]:not([hidden])').waitFor();
      const registration=calls.find(row=>row.action==='register');
      assert.equal(registration.enrollment.phone,expectedPhone);
      assert.equal(registration.enrollment.birthdayDay,withBirthday?29:undefined);
      assert.equal(registration.enrollment.birthdayMonth,withBirthday?2:undefined);
      assert.equal(registration.enrollment.privacyAccepted,true);
      assert.equal(registration.enrollment.marketingAccepted,false);
      assert.equal(calls.filter(row=>row.action==='register').length,1);
      assert.equal(await page.evaluate(()=>localStorage.getItem('bmood_rewards_portal_token')),null);
      await page.getByRole('button',{name:'Agregar a Apple Wallet',exact:true}).click();
      await page.locator('[data-wallet-status]').getByText('Tarjeta temporalmente no disponible. Intenta de nuevo.',{exact:true}).waitFor();
      assert.equal(await page.getByRole('button',{name:'Agregar a Apple Wallet',exact:true}).isEnabled(),true);
      for(const platform of ['Apple Wallet','Google Wallet']){
        await page.getByRole('button',{name:`Agregar a ${platform}`,exact:true}).click();
        await page.waitForURL('**/wallet-test/**');
        await page.goto('https://bmood.test/recompensas/');
        await page.locator('[data-portal-results]:not([hidden])').waitFor();
      }
      await page.reload();
      await page.locator('[data-portal-results]:not([hidden])').waitFor();
      assert.equal(await form.isVisible(),false,'Verified consultation survives reload in the same tab');
      assert.equal(calls.filter(row=>row.action==='request').length,1,'Reload does not send another code');
      await page.locator('[data-enrollment-signout]').click();
      await form.waitFor();
      assert.equal(await page.locator('[data-portal-results]').isVisible(),false);
      assert.equal(await form.locator('[name=code]').isEnabled(),false);
      assert.equal(await form.locator('[name=email]').inputValue(),'');
      await form.locator('[name=mode][value=login]').check();
      assert.equal(await form.locator('[name=name]').isEnabled(),false);
      assert.equal(await form.locator('[name=privacyAccepted]').isEnabled(),false);
      pendingLink=true;
      await form.locator('[name=phone]').fill('222 123 4567');
      await form.locator('[name=email]').fill('existing@example.test');
      await form.locator('[data-enrollment-submit]').click();
      await form.locator('[name=code]:enabled').waitFor();
      await form.locator('[name=code]').fill('000000');
      await form.locator('[data-enrollment-submit]').click();
      await page.locator('[data-portal-status]').getByText('Código inválido o vencido.',{exact:true}).waitFor();
      await form.locator('[name=code]').fill('123456');
      await form.locator('[data-enrollment-submit]').click();
      await page.locator('[data-enrollment-link]').click();
      await form.locator('[name=name]').fill('Cuenta anterior');

      await form.locator('[name=privacyAccepted]').check();
      await form.locator('[data-enrollment-submit]').click();
      await page.locator('[data-enrollment-pending]:not([hidden])').waitFor();
      assert.equal(await page.locator('[data-portal-results]').isVisible(),false,'Pending linkage never exposes balances');
      assert.equal(calls.filter(row=>row.action==='request').length,2,'Activating an existing account reuses the verified code');
      pendingLink=false;
      await page.locator('[data-enrollment-check]').click();
      await page.locator('[data-portal-results]:not([hidden])').waitFor();
      await page.locator('[data-enrollment-signout]').click();
      assert.equal(await page.evaluate(()=>sessionStorage.getItem('bmood_rewards_portal_token')),null,'Logout clears tab session');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await form.screenshot({path:`${evidence}/${name}-${device}.png`});
      assert.deepEqual(errors,[]);
      await context.close();
      console.log(`PASS ${name}/${device}: registration, optional birthday, international phone, both Wallet actions, separate consent, reload, invalid code, assisted linkage, logout and login mode`);
    }
  }finally{await browser.close();}
}
console.log('Isolated enrollment UI only: no real email, customer creation or Wallet installation.');
