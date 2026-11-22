const CACHE='bm-coffee-lab-shell-v2';
const BASE='/coffee-lab/';
const CORE=['/coffee-lab/','/coffee-lab/manifest.webmanifest','/coffee-lab/icon-192.png','/coffee-lab/icon-512.png','/coffee-lab/brand/better-mood.png','/coffee-lab/brand/app-icon.svg','/coffee-lab/brand/Metropolis-Regular.woff','/coffee-lab/brand/Metropolis-SemiBold.woff'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)))});
// An update waits for all tabs to close; it never interrupts a brewing session.
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('bm-coffee-lab-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('message',event=>{if(event.data?.type!=='CACHE_URLS'||!Array.isArray(event.data.urls))return;event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 const urls=event.data.urls.filter(u=>{try{const x=new URL(u);return x.origin===self.location.origin&&x.pathname.startsWith(BASE)&&!x.pathname.startsWith(BASE+'api/')&&/\.(js|css|png|webp|mp3|svg|woff2?)$/.test(x.pathname)}catch{return false}});
 const results=await Promise.allSettled(urls.map(async u=>{
  if(await cache.match(u))return;
  const response=await fetch(u);
  if(!response.ok)throw new Error('Resource unavailable');
  await cache.put(u,response);
 }));
 if(urls.some(u=>/\.js(?:\?|$)/.test(u))&&results.every(r=>r.status==='fulfilled')&&await cache.match(BASE))event.source?.postMessage({type:'OFFLINE_READY'});
})())});
self.addEventListener('fetch',event=>{const req=event.request,u=new URL(req.url);if(req.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(BASE)||u.pathname.startsWith(BASE+'api/'))return;if(req.mode==='navigate'&&u.pathname===BASE){event.respondWith(fetch(req).then(async r=>{if(r.ok&&r.headers.get('content-type')?.includes('text/html')){const c=await caches.open(CACHE);await c.put(BASE,r.clone())}return r}).catch(()=>caches.match(BASE)));return}if(/\.(js|css|png|webp|mp3|svg|woff2?|webmanifest)$/.test(u.pathname)){event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(async r=>{if(r.ok){const c=await caches.open(CACHE);await c.put(req,r.clone())}return r})))}});
