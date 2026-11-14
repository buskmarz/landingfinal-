import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium,webkit} from 'playwright';
const root=process.cwd(),out='/tmp/bmc-quick-evidence';await mkdir(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'};
for(const [engineName,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch();
 try{for(const [name,width,height] of [['iphone',390,844],['small',375,667],['tablet',820,1180],['desktop',1440,1000]]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();
  const calls=[],errors=[];let existing=false;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.pathname.includes('loyalty-enrollment-auth')){
    if(req.method()==='GET')return route.fulfill({json:{emailVerificationRequired:true,registrationAvailable:true,quickRegistrationAvailable:true,hybridProgramActive:true}});
    const body=req.postDataJSON();calls.push(body);assert.equal(body.action,'register_quick');assert.match(body.deviceKey,/^[a-f0-9]{64}$/);
    return route.fulfill({json:{status:existing?'recovery_required':'ready'}});
   }
   if(u.pathname.endsWith('loyalty-portal')){
    const body=req.method()==='POST'?req.postDataJSON():{};calls.push(body);
    if(body.action)return route.fulfill({json:{ok:true,installUrl:'https://bmood.test/wallet'}});
    if(req.method()==='POST')assert.ok(body.deviceKey);return route.fulfill({json:{ok:true,token:'fixture',customer:{customer:{name:'Cliente de prueba'},profile:{loyaltyProgram:'hybrid',availableCashbackBalance:0,currentProgressVisits:0,visitsPerReward:6},wallet:{passes:[]}}}});
   }
   if(u.pathname==='/wallet')return route.fulfill({contentType:'text/html',body:'<h1>Wallet aislado</h1>'});
   if(u.hostname!=='bmood.test')return route.fulfill({status:204,body:''});
   const f=resolve(root,`.${u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname}`);
   if(!f.startsWith(root+'/'))return route.abort();
   try{return route.fulfill({body:await readFile(f),contentType:types[extname(f)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}
  });
  await page.goto('https://bmood.test/recompensas/');
  const form=page.locator('[data-enrollment-form]');await form.waitFor();
  assert.equal(await form.locator('[name=email]').isVisible(),false);
  await form.locator('[name=name]').fill('Cliente de prueba');await form.locator('[name=phone]').fill('2221234567');
  await form.locator('[name=privacyAccepted]').check();
  await form.screenshot({path:`${out}/${engineName}-${name}-join.png`});
  await page.getByRole('button',{name:'Crear mi tarjeta',exact:true}).click();
  await page.locator('[data-portal-results]:not([hidden])').waitFor();
  assert.equal(calls[0].enrollment.email,'');assert.equal(calls[0].enrollment.birthdayDay,undefined);
  await page.locator('[data-portal-results]').screenshot({path:`${out}/${engineName}-${name}-wallet.png`});
  await page.getByRole('button',{name:'Agregar a Apple Wallet',exact:true}).click();await page.waitForURL('**/wallet');
  await page.goto('https://bmood.test/recompensas/');
  await page.getByRole('button',{name:'Cerrar consulta',exact:true}).click();existing=true;
  await form.locator('[name=name]').fill('Otro intento');await form.locator('[name=phone]').fill('2221234567');await form.locator('[name=privacyAccepted]').check();
  await page.getByRole('button',{name:'Crear mi tarjeta',exact:true}).click();
  await page.getByText('No pudimos crear una tarjeta nueva con estos datos.',{exact:false}).waitFor();
  assert.equal(await form.locator('[name=email]').isVisible(),true);
  assert.equal(await page.locator('[data-portal-results]').isVisible(),false);
  assert.deepEqual(errors,[]);console.log(`${engineName} ${name}: quick signup, Wallet handoff and protected duplicate passed`);await context.close();
 }}finally{await browser.close();}
}
