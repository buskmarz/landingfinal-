import { startScanner, stopScanner } from './admin/scanner.mjs';
import {series} from './catalog.mjs';
const main=document.querySelector('main');
let campaign=new URLSearchParams(location.search).get('camp')==='prueba'?'prueba':'freak-2026';
let shareLocation=false;
const localPhone=p=>String(p||'').replace(/^\+52(?=\d{10}$)/,'');
let data=null,view='home',selected=null,token='',recovery='',busy=false,pendingClaim=false;
const art=i=>`/freak/${series[i].art}.png`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ordinal=t=>String(t.displayNumber??t.number).padStart(3,'0');
const names=series.map(s=>s.name);
const nameInput='<label for="person-name">Tu nombre</label><input id="person-name" name="name" autocomplete="given-name" minlength="2" maxlength="60" placeholder="¿Cómo te llamas?" required>';
const phoneInput='<label for="phone">Tu celular</label><input id="phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" minlength="10" maxlength="10" pattern="[0-9]{10}" placeholder="10 dígitos" required>';
const visitCafe=()=>`<section class="visit-card"><h2>Nos vemos en Better Mood.</h2><p>Trae tus stickers a UPAEP. Los contamos contigo.</p><a class="primary" href="https://maps.app.goo.gl/Cx8Rz7zSEPTYzUxr6?g_st=ic" target="_blank" rel="noopener noreferrer">Cómo llegar</a><a class="secondary" href="/menu/">Ver el menú</a></section>`;
const clue=()=>`<section class="clue-card"><h2>La siguiente pista</h2><p>${data?.campaign?.public_hint?esc(data.campaign.public_hint):'Los escondites se revelan aquí. Vuelve pronto.'}</p><a class="secondary" href="https://instagram.com/bettermood.coffee" target="_blank" rel="noopener noreferrer">Seguir en Instagram</a></section>`;

function title(a,b=''){return `<div class="page-title"><h1>${a}</h1>${b?`<p>${b}</p>`:''}</div>`;}
function toast(msg){const el=document.querySelector('#toast');el.textContent=msg;el.style.display='block';setTimeout(()=>el.style.display='none',3500);}
async function api(op,body,extra={}){const res=await fetch(`/api/freak?op=${op}&camp=${campaign}`,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...extra},...(body?{body:JSON.stringify(body)}:{}),credentials:'same-origin',cache:'no-store'});let result;try{result=await res.json()}catch{throw Error('No pudimos conectar. Intenta de nuevo.')}if(!res.ok&&!(op==='claim'&&result.state)){const e=Error(result.error||'No pudimos completar este acto.');e.code=result.code;throw e}return result;}
async function refresh(){data=await api('state');}
function stopCamera(){stopScanner();}
function go(next){stopCamera();view=next;document.querySelector('#menu-panel').hidden=true;document.querySelector('#menu').setAttribute('aria-expanded','false');render();scrollTo({top:0,behavior:'instant'});}
function ticketRow(t){return `<article class="ticket ticket-row ${t.rare?'rare':''}"><div class="ticket-info"><span class="ticket-number">${ordinal(t)} · ${esc(t.code||'')}</span><h3>${esc(t.name)}</h3>${t.rare?'<span class="rare-label">Edición de 10</span>':''}</div><img src="${art(t.act)}" alt="${esc(t.name)}" loading="lazy"></article>`;}
function render(){
 document.querySelector('#campaign-chip').textContent=campaign==='prueba'?'INTERNO':'';
 document.querySelector('#campaign-chip').hidden=campaign!=='prueba';
 document.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.go===view?'page':'false'));
 let html='';
 if(view==='home')html=`<div class="wordmark" aria-label="FREAK">F<span class="r">R<svg class="ghost" viewBox="0 0 20 25" aria-hidden="true"><path d="M1 25V10a9 9 0 0 1 18 0v15l-4-3-5 3-5-3z"/><circle cx="7" cy="10" r="1.6"/><circle cx="13" cy="10" r="1.6"/></svg></span>EAK</div><div class="collection-preview">${series.map((s,i)=>`<img src="${art(i)}" alt="${esc(s.name)}" ${i?'loading="lazy"':''}>`).join('')}</div><section class="hero-copy"><h1>Busca. Encuentra.<br>Colecciona.</h1><p class="state-note">Stickers escondidos cerca de UPAEP.<br>Llévate el que encuentres.</p><button class="primary" data-go="scan">Escanear sticker</button><p class="state-note">¿Sin escanear? Tráelos a Better Mood UPAEP.</p></section><section class="intro"><p class="date">28 octubre · Better Mood UPAEP</p><p>DJ en vivo · Pumpkin Spice Latte + Maracuyá</p><button class="secondary" data-go="rules">Cómo participar</button><button class="secondary" id="invite">Invitar a un amigo</button></section>${clue()}${visitCafe()}`;
 if(view==='collection')html=title('Mi colección',data?.person?'Tu próximo hallazgo te espera.':'Guarda tus hallazgos con tu teléfono.')+(data?.person?`${album()}${visitCafe()}<details><summary>Mis ${data.owned.length} stickers</summary>${data.owned.map(ticketRow).join('')}</details>${data.owned.length?'':'<p class="state-note">Tu primer sticker te espera.</p>'}<button class="primary" data-go="scan">Añadir sticker</button>`:`<button class="primary" data-go="scan">Escanear mi primer sticker</button><button class="secondary" data-go="login">Ya tengo cuenta</button>`);
 if(view==='ranking')html=title('La comunidad','Sal a buscar con alguien.')+`<button class="primary" id="invite">Invitar a un amigo</button><h2 class="community-title">Quiénes coleccionan</h2>`+(data?.ranking.length?`<table class="ranking"><thead><tr><th>#</th><th>Coleccionista</th><th>Artistas</th></tr></thead><tbody>${data.ranking.map(r=>`<tr class="${r.mine?'mine':''}"><td>${r.place}</td><td>${esc(r.name)}${r.mine?' · tú':''}</td><td>${r.artists} / 4</td></tr>`).join('')}</tbody></table>`:'<p class="state-note">Sé el primero en guardar un sticker.</p>')+`${clue()}<p class="small">Artistas guardados en línea. Las entregas se cuentan en cafetería.</p><button class="secondary" id="refresh">Actualizar</button>`;
 if(view==='account'){
 if(recovery)html=title('Tu acceso está listo')+`<section class="recovery"><h2>${esc(localPhone(data?.person?.phone))}</h2><p>Tu clave son los últimos 4 dígitos de tu celular.</p><code>${esc(recovery)}</code></section><button class="primary" id="saved-key">${pendingClaim?'Guardar mi sticker':'Ir a mi colección'}</button>`;
 else if(data?.person)html=title('Mi acceso',esc(localPhone(data.person.phone)))+`<p class="state-note">Tu clave: los últimos 4 dígitos de tu celular.</p><button class="primary" data-go="collection">Mi colección</button>${!data.person.display_name?`<form class="form" id="name-form">${nameInput}<button class="primary">Guardar nombre</button></form>`:''}<button class="secondary" id="logout">Cerrar sesión</button>`;
 else if(!pendingClaim||selected?.state!=='available')html=title('Tu primer hallazgo')+`<p class="state-note">Escanea un sticker para empezar tu colección.</p><button class="primary" data-go="scan">Escanear sticker</button><button class="secondary" data-go="login">Ya tengo cuenta</button>`;
 else html=title('Guarda tu colección')+`<form class="form" id="register-form">${nameInput}${phoneInput}<button class="primary" ${!data?.campaign?.active?'disabled':''}>Continuar</button></form><p class="form-help">Tu nombre aparece en la comunidad. Tu celular y ubicación son privados. Sin mensajes publicitarios. <a href="/aviso-privacidad.html#freak">Privacidad</a>.</p><button class="secondary" data-go="login">Ya tengo cuenta</button>`;
 }
 if(view==='login')html=title('Vuelve a tu colección')+`<form class="form" id="login-form">${phoneInput}<label for="key">Últimos 4 dígitos de tu celular</label><input id="key" name="recovery" type="password" inputmode="numeric" autocomplete="current-password" minlength="4" maxlength="4" pattern="[0-9]{4}" placeholder="Tu clave" required><button class="primary">Entrar</button></form><button class="secondary" data-go="account">Empezar mi colección</button>`;
 if(view==='scan')html=title('Escanea tu sticker')+`<button class="primary" id="camera">Abrir cámara</button><div id="scanner" hidden><video id="scan-video" playsinline muted aria-label="Cámara para escanear QR"></video><button class="secondary" id="stop-scan">Cerrar cámara</button><p id="scan-status" role="status"></p></div><details><summary>Pegar enlace QR</summary><form class="form" id="scan-form"><label for="ticket-url">Enlace</label><textarea id="ticket-url" name="url" autocomplete="off" required></textarea><button class="secondary">Abrir sticker</button></form></details><p class="state-note">Sin cuenta: tráelos a Better Mood UPAEP.</p>`;
 if(view==='claim'){
 const states={available:'Disponible',owned:'Ya es tuyo',occupied:'Ya tiene dueño',received:'Contado en cafetería',unreleased:'Aún no disponible',invalid:'QR no válido'};
 const state=selected?.state||'invalid',t=selected?.ticket;
 html=title(state==='owned'?'¡Es tuyo!':state==='available'?'Lo encontraste.':'Este sticker');
 if(t)html+=`<article class="ticket big-ticket ${t.rare?'rare':''}"><span class="ticket-number">${ordinal(t)} · ${esc(t.code||'')}</span><img src="${art(t.act)}" alt="${esc(t.name)}"><span class="ticket-status">${states[state]}</span></article>`;
 else html+=`<p class="state-note">${states[state]}</p>`;
 if(state==='owned')html+=`<p class="state-note">${new Set(data.owned.map(t=>t.act)).size} de 4 artistas</p><button class="secondary" id="invite">Invitar a un amigo</button>`;
 if(state==='available')html+=`<label class="location-choice"><input type="checkbox" id="share-location" ${shareLocation?'checked':''}> Compartir ubicación del hallazgo</label><p class="form-help">Opcional. Solo la ve Better Mood.</p><button class="primary" id="claim">${data?.person?'Guardar en mi colección':'Guardar en mi colección'}</button><p class="state-note">O guárdalo físicamente y tráelo a Better Mood UPAEP.</p>`;
 html+=`<button class="secondary" data-go="${state==='owned'?'collection':'scan'}">${state==='owned'?'Mi colección':'Buscar otro'}</button>`;
 }
 if(view==='rules')html=title('A tu manera.')+`<div class="rules"><section class="rule"><div><h3>Encuentra.</h3><p>Busca stickers cerca de UPAEP. Llévate el que encuentres. Deja otros para alguien más.</p></div></section><section class="rule"><div><h3>Colecciona.</h3><p>Escanea y guarda con tu teléfono. Descubre los 4 artistas.</p></div></section><section class="rule"><div><h3>Nos vemos en Better Mood.</h3><p>Sin escanear también cuenta: tráelos a Better Mood UPAEP.</p></div></section></div><details><summary>Tu colección</summary><p class="small">Cada sticker se registra una sola vez. Tu teléfono no se muestra. No necesitas comprar para buscar; no hay premios anunciados por ahora.</p></details><button class="primary" data-go="scan">Buscar stickers</button>`;
 main.innerHTML=html;bind();
}
function fail(e){let el=main.querySelector('.error');if(!el){el=document.createElement('p');el.className='error';el.setAttribute('role','alert');main.append(el)}el.textContent=e.message;el.scrollIntoView({block:'nearest'});}
async function action(fn){if(busy)return;busy=true;main.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn()}catch(e){fail(e)}finally{busy=false;main.querySelectorAll('button').forEach(b=>b.disabled=false);if(!data?.campaign?.active&&view==='account')main.querySelector('#register-form button')?.setAttribute('disabled','');}}
function readTicket(value){try{const u=new URL(value,location.origin);if(u.origin!==location.origin||!/^\/freak\/?$/.test(u.pathname))throw Error();const c=u.searchParams.get('camp')||'freak-2026';const t=new URLSearchParams(u.hash.slice(1)).get('boleto');if(!['prueba','freak-2026'].includes(c)||!t||!/^[A-Za-z0-9_-]{43}$/.test(t))throw Error();return{campaign:c,token:t};}catch{throw Error('Este enlace no es un boleto FREAK válido de Better Mood.');}}
async function openTicket(value){const parsed=readTicket(value);if(campaign!==parsed.campaign){campaign=parsed.campaign;await refresh()}if(token!==parsed.token)shareLocation=false;token=parsed.token;try{let visit=sessionStorage.getItem('freak-visit');if(!visit){visit=crypto.randomUUID();sessionStorage.setItem('freak-visit',visit)}await api('visit',{token,visit})}catch{}history.replaceState(null,'',`?camp=${campaign}#boleto=${token}`);await inspect();}
async function inspect(){try{selected=await api('ticket',null,{'X-Freak-Ticket':token})}catch(e){if(e.code==='invalid')selected={state:'invalid'};else throw e}go('claim');}
async function afterLogin(){await refresh();if(recovery)go('account');else if(token&&pendingClaim)await saveTicket();else if(token)await inspect();else go('collection');}
function bind(){main.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));const on=(id,fn)=>{const el=document.getElementById(id);if(el)el.onclick=()=>action(fn)};
 const reg=document.querySelector('#register-form');if(reg)reg.onsubmit=e=>{e.preventDefault();action(async()=>{const r=await api('register',Object.fromEntries(new FormData(reg)));recovery=r.recovery;await afterLogin()})};
 const profile=document.querySelector('#name-form');if(profile)profile.onsubmit=e=>{e.preventDefault();action(async()=>{await api('profile-name',Object.fromEntries(new FormData(profile)));await refresh();if(token&&pendingClaim)await saveTicket();else go('collection')})};
 const login=document.querySelector('#login-form');if(login)login.onsubmit=e=>{e.preventDefault();action(async()=>{await api('login',Object.fromEntries(new FormData(login)));await afterLogin()})};
 const scan=document.querySelector('#scan-form');if(scan)scan.onsubmit=e=>{e.preventDefault();action(()=>openTicket(new FormData(scan).get('url')))};
 const gps=document.querySelector('#share-location');if(gps)gps.onchange=()=>{shareLocation=gps.checked};
 on('claim',async()=>{if(!data?.person){pendingClaim=true;go('account');return}await saveTicket();});
 on('logout',async()=>{await api('logout',{});recovery='';await refresh();go('account')});
 on('refresh',async()=>{await refresh();render();toast('Clasificación actualizada.');});
 on('saved-key',async()=>{recovery='';if(token&&pendingClaim)await saveTicket();else if(token)await inspect();else go('collection')});
 on('camera',startCamera);
 on('invite',invite);
 const close=document.querySelector('#stop-scan');if(close)close.onclick=stopScanner;
}
async function startCamera(){await startScanner(raw=>action(()=>openTicket(raw)),toast);}
async function captureLocation(){
 if(!navigator.geolocation){toast('GPS no disponible. Guardaremos sin ubicación.');return null;}
 toast('Buscando tu ubicación…');
 return new Promise(resolve=>navigator.geolocation.getCurrentPosition(p=>resolve({consent:true,latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy}),()=>{toast('Guardaremos sin ubicación.');resolve(null)},{enableHighAccuracy:true,timeout:8000,maximumAge:0}));
}
async function saveTicket(){if(data?.person?.phone&&!data.person.display_name){pendingClaim=true;go('account');return}try{const location=shareLocation?await captureLocation():null;selected=await api('claim',{token,...(location?{location}:{})})}catch(e){if(e.code==='login'){await refresh();pendingClaim=true;go('account');return}if(e.code)await inspect();throw e}pendingClaim=false;shareLocation=false;await refresh();go('claim');if(selected.state==='owned')toast('Sticker guardado.');}
function album(){const acts=new Set(data.owned.map(t=>t.act));return `<p class="album-count">${acts.size} de 4 artistas${acts.size===4?' · ¡Colección completa!':''}</p><div class="album">${series.map((s,i)=>`<article class="album-card ${acts.has(i)?'found':''}"><img src="${art(i)}" alt="" loading="lazy"><h2>${esc(s.name)}</h2><p>${acts.has(i)?'✓ Encontrado':'Por encontrar'}</p></article>`).join('')}</div>`;}
async function invite(){const url='https://bmoodcoffee.com/freak/';const text='¿Buscamos juntos? Encuentra los 4 artistas FREAK cerca de UPAEP. Nos vemos en Better Mood.';if(navigator.share){try{await navigator.share({title:'FREAK · Better Mood',text,url});return}catch(e){if(e.name==='AbortError')return;}}try{await navigator.clipboard.writeText(`${text} ${url}`);toast('Invitación copiada. Compártela con un amigo.');}catch{let el=document.querySelector('#share-link');if(!el){el=document.createElement('p');el.id='share-link';main.append(el);}el.innerHTML='<a href="https://bmoodcoffee.com/freak/">bmoodcoffee.com/freak/</a><br>Copia este enlace para invitar.';}}
document.querySelectorAll('nav [data-go],#menu-panel [data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
document.querySelector('#menu').onclick=()=>{const p=document.querySelector('#menu-panel');p.hidden=!p.hidden;document.querySelector('#menu').setAttribute('aria-expanded',String(!p.hidden))};
window.addEventListener('pagehide',stopCamera);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera()});
window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#boleto='))action(()=>openTicket(location.href))});
main.innerHTML='<p class="loading">Cargando…</p>';
try{await refresh();if(location.hash.startsWith('#boleto='))await openTicket(location.href);else render()}catch(e){render();fail(e)}
