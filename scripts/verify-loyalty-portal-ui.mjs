import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium,webkit} from 'playwright';

// Browser plugin not available. Isolated Playwright routes never contact production.
const root=process.cwd();
const evidence='/private/tmp/bmc-hybrid-portal-ui';
await mkdir(evidence,{recursive:true});
const contentTypes={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch({headless:true});
  try{
    for(const [device,viewport] of Object.entries({desktop:{width:1440,height:1000},tablet:{width:820,height:1180},mobile:{width:390,height:844}})){
      const context=await browser.newContext({viewport});
      let hybrid=true;
      const page=await context.newPage();
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await context.addInitScript(()=>localStorage.setItem('bmood_rewards_portal_token','isolated-session'));
      await page.route('**/*',async route=>{
        const url=new URL(route.request().url());
        if(url.pathname.includes('loyalty-enrollment-auth'))return route.fulfill({json:{emailVerificationRequired:false}});
        if(url.pathname.includes('recompensas-consulta'))return route.fulfill({json:{ok:true,token:'isolated-session',customer:{customer:{name:'Cliente de prueba',phoneMasked:'******00'},profile:{loyaltyProgram:hybrid?'hybrid':'cashback',availableCashbackBalance:'500.00',pendingCashbackBalance:'25.00',cashbackLevelLabel:'Bronce',cashbackPct:hybrid?'5.00':'3.00',currentProgressVisits:5,visitsPerReward:6,availableRewardsCount:2,amountToNextTier:100,nextTierLabel:'Plata'},movements:[],wallet:[]}}});
        if(url.hostname!=='bmood.test')return route.fulfill({status:204,body:''});
        const relative=decodeURIComponent(url.pathname.endsWith('/')?`${url.pathname}index.html`:url.pathname);
        const file=resolve(root,`.${relative}`);
        if(!file.startsWith(root+'/'))return route.abort();
        try{return route.fulfill({body:await readFile(file),contentType:contentTypes[extname(file)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}
      });
      await page.goto('https://bmood.test/recompensas/');
      await page.locator('[data-portal-results]:not([hidden])').waitFor();
      assert.equal(await page.locator('[data-portal-level]').textContent(),'5% de cashback + sellos');
      assert.equal(await page.locator('[data-portal-progress-title]').textContent(),'Sellos');
      assert.equal(await page.locator('[data-portal-next-amount]').textContent(),'5 de 6');
      assert.equal(await page.locator('[data-portal-next-label]').textContent(),'2 bebidas gratis disponibles');
      assert.ok((await page.locator('[data-portal-balance]').textContent()).includes('500'));
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
      assert.equal(overflow,false,`${name}/${device} horizontal overflow`);
      await page.locator('[data-portal-results]').screenshot({path:`${evidence}/${name}-${device}.png`});
      hybrid=false;await page.reload();
      await page.locator('[data-portal-results]:not([hidden])').waitFor();
      assert.equal(await page.locator('[data-portal-progress-title]').textContent(),'Progreso de nivel');
      assert.ok((await page.locator('[data-portal-level]').textContent()).includes('3.00%'));
      await page.locator('[data-portal-reset]').click();
      assert.equal(await page.locator('[data-portal-results]').isVisible(),false);
      assert.deepEqual(errors,[],`${name}/${device} browser exceptions`);
      await context.close();
      console.log(`PASS ${name}/${device}: active hybrid, legacy compatibility, balances, logout and no overflow`);
    }
  }finally{await browser.close();}
}
console.log(`Isolated UI evidence: ${evidence}; not a live financial or Wallet installation test.`);
