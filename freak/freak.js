import {series} from './catalog.mjs';
const main=document.querySelector('main');
let campaign=new URLSearchParams(location.search).get('camp')==='prueba'?'prueba':'freak-2026';
let data=null,view='home',selected=null,token='',recovery='',busy=false,camera=null,scanFrame=0;
const art=i=>`/freak/${series[i].art}.png`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names=series.map(s=>s.name);
function title(a,b=''){return `<div class="page-title"><h1>${a}</h1>${b?`<p>${b}</p>`:''}</div>`;}
function toast(msg){const el=document.querySelector('#toast');el.textContent=msg;el.style.display='block';setTimeout(()=>el.style.display='none',3500);}
async function api(op,body,extra={}){const res=await fetch(`/api/freak?op=${op}&camp=${campaign}`,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...extra},...(body?{body:JSON.stringify(body)}:{}),credentials:'same-origin',cache:'no-store'});let result;try{result=await res.json()}catch{throw Error('No pudimos conectar. Intenta de nuevo.')}if(!res.ok&&!(op==='claim'&&result.state)){const e=Error(result.error||'No pudimos completar este acto.');e.code=result.code;throw e}return result;}
async function refresh(){data=await api('state');}
function stopCamera(){if(camera){camera.getTracks().forEach(t=>t.stop());camera=null}cancelAnimationFrame(scanFrame);}
function go(next){stopCamera();view=next;document.querySelector('#menu-panel').hidden=true;document.querySelector('#menu').setAttribute('aria-expanded','false');render();scrollTo({top:0,behavior:'instant'});}
function ticketRow(t){return `<article class="ticket ticket-row ${t.rare?'rare':''}"><div class="ticket-info"><span class="ticket-number">${esc(t.code||String(t.number).padStart(3,'0'))}</span><h3>${esc(t.name)}</h3>${t.rare?'<span class="rare-label">Edición de 10</span>':''}</div><img src="${art(t.act)}" alt="${esc(t.name)}" loading="lazy"></article>`;}
function render(){
 document.querySelector('#campaign-chip').textContent=campaign==='prueba'?'INTERNO':'';
 document.querySelector('#campaign-chip').hidden=campaign!=='prueba';
 document.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.go===view?'page':'false'));
 let html='';
 if(view==='home')html=`<div class="wordmark" aria-label="FREAK">F<span class="r">R<svg class="ghost" viewBox="0 0 20 25" aria-hidden="true"><path d="M1 25V10a9 9 0 0 1 18 0v15l-4-3-5 3-5-3z"/><circle cx="7" cy="10" r="1.6"/><circle cx="13" cy="10" r="1.6"/></svg></span>EAK</div><div class="collection-preview">${series.map((s,i)=>`<img src="${art(i)}" alt="${esc(s.name)}" ${i?'loading="lazy"':''}>`).join('')}</div><section class="hero-copy"><h1>Encuéntralos.<br>Hazlos tuyos.</h1><p class="state-note">100 stickers · 4 personajes</p><button class="primary" data-go="scan">Escanear sticker</button><p class="state-note">O tráelos a Better Mood UPAEP.</p></section><section class="intro"><p class="date">28 octubre · Better Mood UPAEP</p><p>DJ en vivo · Pumpkin Spice Latte + Maracuyá</p><button class="secondary" data-go="rules">Cómo participar</button></section>`;
 if(view==='collection')html=title('Mi colección',data?.person?esc(data.person.alias):'Guarda tus stickers con un alias.')+(data?.person?`<div class="counter">${data.owned.length}<small>STICKERS</small></div>${data.owned.map(ticketRow).join('')}${data.owned.length?'':'<p class="state-note">Tu primer sticker te espera.</p>'}<button class="primary" data-go="scan">Añadir sticker</button>`:`<button class="primary" data-go="account">Crear mi colección</button><button class="secondary" data-go="login">Ya tengo cuenta</button>`);
 if(view==='ranking')html=title('Quiénes coleccionan')+(data?.ranking.length?`<table class="ranking"><thead><tr><th>#</th><th>Alias</th><th>Stickers</th><th>Raros</th></tr></thead><tbody>${data.ranking.map(r=>`<tr class="${r.mine?'mine':''}"><td>${r.place}</td><td>${esc(r.alias)}${r.mine?' · tú':''}</td><td>${r.total}</td><td>${r.rares}</td></tr>`).join('')}</tbody></table>`:'<p class="state-note">Sé el primero en guardar un sticker.</p>')+`<p class="small">Capturas digitales. Las entregas físicas se registran en cafetería.</p><button class="secondary" id="refresh">Actualizar</button>`;
 if(view==='account'){
 if(recovery)html=title('Tu clave de regreso')+`<section class="recovery"><h2>${esc(data?.person?.alias)}</h2><p>Guárdala para entrar desde otro teléfono.</p><code>${esc(recovery)}</code><button class="secondary" id="copy-key">Copiar acceso</button><button class="secondary" id="download-key">Descargar acceso</button></section><button class="primary" id="saved-key">Listo, continuar</button>`;
 else if(data?.person)html=title(esc(data.person.alias))+`<button class="primary" data-go="collection">Mi colección</button><button class="secondary" id="logout">Cerrar sesión</button>`;
 else html=title('Elige tu alias')+`<form class="form" id="register-form"><label for="alias">Alias público</label><input id="alias" name="alias" autocomplete="nickname" minlength="3" maxlength="24" placeholder="¿Cómo te llamamos?" required><button class="primary" ${!data?.campaign?.active?'disabled':''}>Continuar</button></form><p class="form-help">Guardamos tu alias y capturas. <a href="/aviso-privacidad.html">Privacidad</a>.</p><button class="secondary" data-go="login">Ya tengo cuenta</button>`;
 }
 if(view==='login')html=title('Vuelve a tu colección')+`<form class="form" id="login-form"><label for="alias">Alias</label><input id="alias" name="alias" autocomplete="username" maxlength="24" required><label for="key">Clave privada</label><input id="key" name="recovery" type="password" autocomplete="current-password" maxlength="80" required><button class="primary">Entrar</button></form><button class="secondary" data-go="account">Crear cuenta</button>`;
 if(view==='scan')html=title('Escanea tu sticker')+`<button class="primary" id="camera">Abrir cámara</button><div id="camera-panel"></div><details><summary>Pegar enlace QR</summary><form class="form" id="scan-form"><label for="ticket-url">Enlace</label><textarea id="ticket-url" name="url" autocomplete="off" required></textarea><button class="secondary">Abrir sticker</button></form></details><p class="state-note">Sin cuenta: tráelos a Better Mood UPAEP.</p>`;
 if(view==='claim'){
 const states={available:'Disponible',owned:'Ya es tuyo',occupied:'Ya tiene dueño',received:'Contado en cafetería',unreleased:'Aún no disponible',invalid:'QR no válido'};
 const state=selected?.state||'invalid',t=selected?.ticket;
 html=title(state==='owned'?'¡Uno más!':'Lo encontraste.');
 if(t)html+=`<article class="ticket big-ticket ${t.rare?'rare':''}"><span class="ticket-number">${esc(t.code||String(t.number).padStart(3,'0'))}</span><img src="${art(t.act)}" alt="${esc(t.name)}"><span class="ticket-status">${states[state]}</span></article>`;
 else html+=`<p class="state-note">${states[state]}</p>`;
 if(state==='available')html+=`<button class="primary" id="claim">${data?.person?'Guardar en mi colección':'Elegir alias y guardar'}</button><p class="state-note">O guárdalo físicamente y tráelo a Better Mood UPAEP.</p>`;
 html+=`<button class="secondary" data-go="${state==='owned'?'collection':'scan'}">${state==='owned'?'Mi colección':'Buscar otro'}</button>`;
 }
 if(view==='rules')html=title('A tu manera.')+`<div class="rules"><section class="rule"><div><h3>Encuentra.</h3><p>Hay 100 stickers: Chiquita, Annie Jones, Lobster Boy y Schlitzie.</p></div></section><section class="rule"><div><h3>Colecciona.</h3><p>Escanea y guarda con tu alias. Cada QR tiene un solo dueño.</p></div></section><section class="rule"><div><h3>O tráelos.</h3><p>¿Sin escanear? Trae tus stickers a Better Mood UPAEP. Los contamos por su código, una sola vez.</p></div></section></div><details><summary>Sobre el ranking</summary><p class="small">Cuenta capturas digitales. En empate: más ediciones raras y después quien llegó primero al total. Las entregas físicas se cuentan aparte, sin duplicar stickers.</p></details><button class="primary" data-go="scan">Buscar stickers</button>`;
 main.innerHTML=html;bind();
}
function fail(e){let el=main.querySelector('.error');if(!el){el=document.createElement('p');el.className='error';el.setAttribute('role','alert');main.append(el)}el.textContent=e.message;el.scrollIntoView({block:'nearest'});}
async function action(fn){if(busy)return;busy=true;main.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn()}catch(e){fail(e)}finally{busy=false;main.querySelectorAll('button').forEach(b=>b.disabled=false);if(!data?.campaign?.active&&view==='account')main.querySelector('#register-form button')?.setAttribute('disabled','');}}
function readTicket(value){try{const u=new URL(value,location.origin);if(u.origin!==location.origin||!/^\/freak\/?$/.test(u.pathname))throw Error();const c=u.searchParams.get('camp')||'freak-2026';const t=new URLSearchParams(u.hash.slice(1)).get('boleto');if(!['prueba','freak-2026'].includes(c)||!t||!/^[A-Za-z0-9_-]{43}$/.test(t))throw Error();return{campaign:c,token:t};}catch{throw Error('Este enlace no es un boleto FREAK válido de Better Mood.');}}
async function openTicket(value){const parsed=readTicket(value);if(campaign!==parsed.campaign){campaign=parsed.campaign;await refresh()}token=parsed.token;try{let visit=sessionStorage.getItem('freak-visit');if(!visit){visit=crypto.randomUUID();sessionStorage.setItem('freak-visit',visit)}await api('visit',{token,visit})}catch{}history.replaceState(null,'',`?camp=${campaign}#boleto=${token}`);await inspect();}
async function inspect(){try{selected=await api('ticket',null,{'X-Freak-Ticket':token})}catch(e){if(e.code==='invalid')selected={state:'invalid'};else throw e}go('claim');}
async function afterLogin(){await refresh();if(recovery)go('account');else if(token)await inspect();else go('collection');}
function bind(){main.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));const on=(id,fn)=>{const el=document.getElementById(id);if(el)el.onclick=()=>action(fn)};
 const reg=document.querySelector('#register-form');if(reg)reg.onsubmit=e=>{e.preventDefault();action(async()=>{const r=await api('register',{alias:new FormData(reg).get('alias')});recovery=r.recovery;await afterLogin()})};
 const login=document.querySelector('#login-form');if(login)login.onsubmit=e=>{e.preventDefault();action(async()=>{await api('login',Object.fromEntries(new FormData(login)));await afterLogin()})};
 const scan=document.querySelector('#scan-form');if(scan)scan.onsubmit=e=>{e.preventDefault();action(()=>openTicket(new FormData(scan).get('url')))};
 on('claim',async()=>{if(!data?.person){go('account');return}try{selected=await api('claim',{token})}catch(e){if(e.code)await inspect();throw e}await refresh();go('claim');if(selected.state==='owned')toast('Captura guardada en tu colección.');});
 on('logout',async()=>{await api('logout',{});recovery='';await refresh();go('account')});
 on('refresh',async()=>{await refresh();render();toast('Clasificación actualizada.');});
 on('copy-key',async()=>{await navigator.clipboard.writeText(`${data.person.alias}\n${recovery}`);toast('Alias y clave copiados. Guárdalos en un lugar privado.');});
 on('download-key',async()=>{const blob=new Blob([`FREAK · Better Mood\nCampaña: ${campaign}\nAlias: ${data.person.alias}\nClave privada: ${recovery}\nRecupera tu acceso: https://bmoodcoffee.com/freak/?camp=${campaign}\nNo compartas esta clave.\n`],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mi-acceso-freak.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Acceso descargado. Conserva el archivo.');});
 on('saved-key',async()=>{recovery='';if(token)await inspect();else go('collection')});
 on('camera',startCamera);
}
async function startCamera(){
 if(!navigator.mediaDevices?.getUserMedia)throw Error('Este navegador no permite cámara. Abre el QR con la cámara de tu teléfono o pega el enlace.');
 stopCamera();
 let detector=null;
 if('BarcodeDetector' in window){try{detector=new BarcodeDetector({formats:['qr_code']})}catch{}}
 if(!detector&&!window.jsQR)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/freak/jsQR.js';script.onload=resolve;script.onerror=()=>reject(Error('No pudimos cargar el lector. Puedes pegar el enlace.'));document.head.append(script)});
 try{camera=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false})}catch{throw Error('No se abrió la cámara. Permite su uso en tu navegador o pega el enlace del boleto.');}
 document.querySelector('#camera-panel').innerHTML='<div class="scan-window"><video autoplay playsinline muted aria-label="Cámara para escanear QR"></video></div><button class="secondary" id="stop-camera">Cerrar cámara</button>';
 document.querySelector('#stop-camera').onclick=()=>{stopCamera();document.querySelector('#camera-panel').innerHTML=''};
 const video=document.querySelector('video');video.srcObject=camera;await video.play();const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});let last=0;
 const tick=async ts=>{if(!camera)return;if(ts-last>180&&video.readyState>=2){last=ts;let found;try{if(detector)found=(await detector.detect(video))[0]?.rawValue;else{canvas.width=Math.min(720,video.videoWidth);canvas.height=canvas.width*video.videoHeight/video.videoWidth;ctx.drawImage(video,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);found=window.jsQR(pixels.data,pixels.width,pixels.height)?.data;}if(found){readTicket(found);stopCamera();await openTicket(found);return}}catch(e){if(found)toast('Ese QR no es un boleto FREAK. Sigue buscando.');}}if(camera)scanFrame=requestAnimationFrame(tick)};scanFrame=requestAnimationFrame(tick);
}
document.querySelectorAll('nav [data-go],#menu-panel [data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
document.querySelector('#menu').onclick=()=>{const p=document.querySelector('#menu-panel');p.hidden=!p.hidden;document.querySelector('#menu').setAttribute('aria-expanded',String(!p.hidden))};
window.addEventListener('pagehide',stopCamera);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera()});
window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#boleto='))action(()=>openTicket(location.href))});
main.innerHTML='<p class="loading">Cargando…</p>';
try{await refresh();if(location.hash.startsWith('#boleto='))await openTicket(location.href);else render()}catch(e){render();fail(e)}
