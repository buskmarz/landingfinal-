// Local a11y/performance audit. QA_AXE points to an existing axe-core bundle.
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.FREAK_QA_CHROMIUM||'/Users/macbookair2020/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const reports=[],axe=process.env.QA_AXE||'/tmp/bm-sensory-recovery-qa/node_modules/axe-core/axe.min.js';
try{
for(const width of [360,1440]){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();
 const cdp=await context.newCDPSession(page);
 if(width===360){await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200*1024,uploadThroughput:80*1024});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
 await page.goto('http://127.0.0.1:5196/freak/');await page.locator('.prize').first().waitFor();await page.evaluate(()=>document.fonts.ready);
 await page.addScriptTag({path:axe});
 const audit=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
 const metrics=await page.evaluate(()=>({navigation:performance.getEntriesByType('navigation').map(x=>({domContentLoaded:x.domContentLoadedEventEnd,load:x.loadEventEnd,bytes:x.transferSize})),resources:performance.getEntriesByType('resource').filter(x=>new URL(x.name).origin===location.origin).map(x=>({path:new URL(x.name).pathname,bytes:x.transferSize,duration:x.duration})),images:[...document.images].map(x=>({path:new URL(x.src).pathname,loaded:x.complete&&x.naturalWidth>0,width:x.width,height:x.height})),scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
 const targets=await page.locator('a:visible,button:visible,input:visible').evaluateAll(nodes=>nodes.map(n=>({tag:n.tagName,text:n.textContent.trim().slice(0,60),width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));
 reports.push({surface:'public',width,simulatedNetwork:width===360?'150ms latency, 200KiB/s down, CPU x4':'unthrottled',violations:audit.violations.map(x=>({id:x.id,impact:x.impact,description:x.description,nodes:x.nodes.map(n=>({target:n.target,failure:n.failureSummary}))})),metrics,targets});
 await page.screenshot({path:`output/freak-review/a11y-public-${width}.png`,fullPage:true});
 await page.keyboard.press('Tab');const active=await page.evaluate(()=>({class:document.activeElement.className,text:document.activeElement.textContent,clip:getComputedStyle(document.activeElement).clipPath}));assert.equal(active.class,'skip');assert.equal(active.clip,'none');await page.keyboard.press('Enter');assert.match(page.url(),/#como-jugar/);
 await page.setViewportSize({width:320,height:800});await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`output/freak-review/text-zoom-${width}.png`,fullPage:true});
 await context.close();
}
const context=await browser.newContext({viewport:{width:360,height:900}}),page=await context.newPage();
await context.route('**/api/freak?*',route=>route.fulfill({json:{prizes:[{id:'1',title:'Premio de prueba',claimed_at:null,delivered_at:null}],validations:[]}}));
await page.goto('http://127.0.0.1:5196/freak/admin/rewards.html');await page.locator('#desk').waitFor({state:'visible'});await page.addScriptTag({path:axe});const audit=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));reports.push({surface:'admin',width:360,violations:audit.violations.map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.map(n=>({target:n.target,failure:n.failureSummary}))}))});
await page.screenshot({path:'output/freak-review/a11y-admin-360.png',fullPage:true});await context.close();
await fs.writeFile('output/freak-review/accessibility-results.json',JSON.stringify({at:new Date().toISOString(),reports},null,2));console.log(reports.map(r=>({surface:r.surface,width:r.width,violations:r.violations})));assert.ok(reports.every(r=>r.violations.length===0),'Review accessibility-results.json');
}finally{await browser.close()}
