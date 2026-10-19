const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state, selected = null, busy = false, loading = false, accessKey = null;
let poster = new URLSearchParams(location.hash.slice(1)).get('premio') || '';
const accessDraft = {name:'', phone:''};
function openSection(target) {
 const details = target?.closest('details'); if (details) details.open = true;
 target?.scrollIntoView({block:'start'});
}
for (const link of document.querySelectorAll('a[href="#como-jugar"],a[href="#premios"]')) link.addEventListener('click', () => { const target=document.querySelector(link.getAttribute('href')); const details=target?.closest('details'); if(details) details.open=true; });
const celebratedPosters = new Set();
let savingPoster = false;
async function savePoster() {
 if (savingPoster || !state?.person || !poster) return;
 savingPoster = true;
 try { await api('reserve-poster', {poster}); message('¡QR guardado! Junta 10 puntos en stickers.'); await load(); }
 catch(error) { message(error.message, true); }
 finally { savingPoster = false; }
}
function celebrateDiscovery() {
  if (!poster || celebratedPosters.has(poster)) return;
  celebratedPosters.add(poster);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div');
  layer.className = 'discovery-confetti'; layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 84; i++) {
    const piece = document.createElement('i');
    piece.style.setProperty('--x', Math.random() * 100 + 'vw');
    piece.style.setProperty('--delay', Math.random() * 4 + 's');
    piece.style.setProperty('--drift', (Math.random() - .5) * 28 + 'vw');
    piece.style.setProperty('--spin', (Math.random() - .5) * 1400 + 'deg');
    piece.style.background = ['#FFDE00', '#FFB800', '#FF5C87', '#FF8A32', '#FFEFA1', '#FFFFFF'][i % 6];
    piece.style.borderRadius = i % 3 === 0 ? '50%' : '2px';
    layer.append(piece);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 12500);
}
function renderDiscovery() {
  $('#discovery-title').textContent = poster ? '¡Encontraste 1 de los 5 QR!' : 'Busca. Junta. Elige.';
  $('#discovery-eyebrow').textContent = poster ? '¡GRAN HALLAZGO!' : 'LA BÚSQUEDA ESTÁ AFUERA';
  $('#discovery-copy').textContent = poster ? 'Guarda el QR. Necesitas 10 puntos para hacer válido tu premio.' : 'Stickers escondidos cerca de UPAEP.';
  $('#discovery-ticket').textContent = 'Cartón gratis en Better Mood para pegar tus stickers.';
  $('#qr-step-title').textContent = poster ? 'QR encontrado' : 'Encuentra un QR';
  $('#qr-step-copy').textContent = poster ? 'Guárdalo con tu celular. Será solo tuyo.' : 'Encuentra uno de los cinco. Elige y confirma tu premio.';
  celebrateDiscovery();
}
renderDiscovery();
function recordPosterVisit() {
 if(!poster || !/^[A-Za-z0-9_-]{43}$/.test(poster))return;
 let visit;try{visit=sessionStorage.getItem('freak-poster-visit');if(!visit){visit=crypto.randomUUID();sessionStorage.setItem('freak-poster-visit',visit);}}catch{visit=crypto.randomUUID();}
 api('poster-visit',{poster,visit}).catch(()=>{});
}
recordPosterVisit();
window.addEventListener('hashchange', () => {
  // Changing or removing the fragment must also remove the old poster credential.
  poster = new URLSearchParams(location.hash.slice(1)).get('premio') || '';
  if (!poster && selected) {
    clearSelection();
    if (state) render();
    message('Tu QR guardado sigue disponible al entrar con tu celular.');
  }
  renderDiscovery();
  recordPosterVisit();
});
// Keep the scanned poster while moving between sections on this page.
for (const link of document.querySelectorAll('a[href^="#"]')) {
  link.addEventListener('click', event => {
    if (!poster) return;
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (target) { event.preventDefault(); openSection(target); }
  });
}
async function api(op, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('/api/freak?op=' + op, {
      method: body ? 'POST' : 'GET', credentials:'same-origin', signal:controller.signal,
      headers: body ? {'Content-Type':'application/json'} : {},
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json();
    if (!response.ok) throw Object.assign(Error(data.error || 'No pudimos completar la acción. Intenta de nuevo.'), {code:data.code, status:response.status});
    return data;
  } catch (error) {
    if (error.name === 'AbortError' || error instanceof TypeError || error instanceof SyntaxError)
      throw Error('No hay conexión con FREAK. Revisa tu internet e intenta de nuevo.');
    throw error;
  } finally { clearTimeout(timeout); }
}
function message(text, focus = false) {
  $('#message').textContent = text;
  if (text && focus) $('#message').focus({preventScroll:false});
}
function clearSelection() {
  selected = null;
  $('#claim-form').reset();
  $('#claim-form').hidden = true;
}
async function load({quiet = false, explicitLogout = false} = {}) {
  if (loading) return;
  loading = true;
  $('#refresh').disabled = true;
  try {
    const next = await api('rewards');
    if (!Array.isArray(next.prizes)) throw Error('No pudimos leer los premios. Intenta de nuevo.');
    if (state?.person && !next.person) {
      clearSelection();
      accessDraft.name = ''; accessDraft.phone = '';
      if (!explicitLogout) message('Tu sesión terminó. Entra de nuevo con tu celular.');
    }
    state = next;
    if (selected && !state.prizes.some(p => p.id === selected && !p.taken)) {
      clearSelection();
      message('Ese premio ya fue elegido. Puedes escoger otro disponible.');
    }
    if (state.mine) clearSelection();
    render();
    return true;
  } catch (error) {
    $('#prize-status').textContent = state ? 'No pudimos actualizar. La disponibilidad puede haber cambiado.' : 'No pudimos cargar los premios.';
    if (!quiet) message(error.message + ' Pulsa Actualizar para reintentar.');
    return false;
  } finally {
    loading = false;
    $('#refresh').disabled = busy;
  }
}
function render() {
  $('#discovery-action').textContent = state.reservation ? 'Consultar mi QR' : poster ? 'Guardar mi QR' : 'Guardar o consultar mi QR';
  $('#discovery-action').href = '#account';
  const available = state.prizes.filter(p => !p.taken).length;
  $('#prize-status').textContent = state.prizes.length === 0 ? 'Los premios aún no están disponibles. Consulta al equipo en barra.' : available === 0 ? 'Todos los premios ya fueron elegidos.' : available === 1 ? 'Queda 1 premio disponible.' : `${available} premios disponibles.`;
  $('#prizes').innerHTML = state.prizes.map(p => `<article class="prize ${p.taken ? 'taken' : ''} ${p.id === selected ? 'selected' : ''}"><small>${p.taken ? 'YA ELEGIDO' : p.id === selected ? 'TU SELECCIÓN · SIN RESERVAR' : 'DISPONIBLE'}</small><h3>${escape(p.title)}</h3><button data-prize="${escape(p.id)}" aria-label="${p.taken ? 'Ya elegido' : 'Elegir'}: ${escape(p.title)}" aria-pressed="${p.id === selected}" ${p.taken || state.mine || busy ? 'disabled' : ''}>${p.taken ? 'Ya elegido' : p.id === selected ? 'Seleccionado' : 'Elegir premio'}</button></article>`).join('');
  $('#claim-form').hidden = !selected || !state.person || !!state.mine;
  if (selected) $('#selection').textContent = 'Elegiste: ' + state.prizes.find(p => p.id === selected).title;
  const key = state.mine ? `mine:${state.mine.id}:${!!state.mine.delivered_at}` : state.person ? `person:${state.person.name}:${state.validation?.points || 0}:${!!state.reservation}:${!!selected}` : 'guest';
  // Polling updates availability without replacing an active form or its inputs.
  if (accessKey === key) return;
  accessKey = key;
  if (state.mine) {
    $('#account').innerHTML = `<div class="account-card"><p class="eyebrow">${state.mine.delivered_at ? 'ENTREGA REGISTRADA' : 'PREMIO CONFIRMADO'}</p><h3>${escape(state.mine.title)}</h3><p>${state.mine.delivered_at ? 'El equipo registró tu entrega.' : 'Ya es tuyo. Coordina la entrega con el equipo.'}</p><button id="logout" class="secondary" type="button">Salir de mi cuenta</button></div>`;
  } else if (state.person) {
    $('#account').innerHTML = `<div class="account-header"><p>Hola, <strong>${escape(state.person.name)}</strong>.</p><button id="logout" class="secondary" type="button">Salir</button></div><div class="points-status"><strong>${state.validation ? escape(state.validation.points) + ' puntos comprobados' : 'Meta: 10 puntos'}</strong><small></small></div><p class="fine-print"></p>`;
  } else {
    $('#account').innerHTML = `<form id="access"><h3>${poster ? "Guarda tu QR" : "Consulta tu QR"}</h3><p>${poster ? "Nombre y celular. Vuelve con el mismo número." : "Escribe el celular con el que lo guardaste."}</p><label for="access-name">Nombre <span class="fine-print">(solo la primera vez)</span></label><input id="access-name" name="name" minlength="2" maxlength="60" autocomplete="given-name" value="${escape(accessDraft.name)}"><label for="access-phone">Celular</label><input id="access-phone" name="phone" type="tel" inputmode="numeric" pattern="[0-9]{10}" minlength="10" maxlength="10" autocomplete="tel-national" required placeholder="10 dígitos" value="${escape(accessDraft.phone)}"><div class="form-actions"><button class="button" name="mode" value="register">${poster ? "Guardar mi QR" : "Crear cuenta"}</button><button class="secondary" name="mode" value="login">Consultar mi QR</button></div><small>¿Ya lo guardaste? Escribe tu celular y toca «Consultar mi QR». <a href="/privacidad/">Privacidad</a></small></form>`;
    $('#access').oninput = event => { accessDraft[event.target.name] = event.target.value; };
    $('#access').onsubmit = access;
  }
  if (state.person && !state.mine) {
 const card = document.createElement('div'); card.className = 'account-card';
 if (state.reservation) card.innerHTML = '<h3>¡QR guardado!</h3><p>Solo tuyo. Junta 10 puntos y trae tus stickers.</p>';
 else if (poster) { const button=document.createElement('button');button.textContent='Guardar mi QR';button.onclick=savePoster;card.append(button); }
 else card.textContent='Encuentra uno de los cinco QR para guardarlo.';
 $('#account').append(card);
 $('#account .points-status small').textContent = state.validation ? 'Comprobados por el equipo.' : 'Trae tus stickers físicos cuando sumes 10 puntos.';
 $('#account > .fine-print').textContent = state.reservation ? state.validation ? 'Ya puedes elegir y confirmar un premio.' : 'Elige tu premio al completar los puntos.' : 'Guarda tu QR para seguir.';
  if (state.reservation) { $('#discovery-action').textContent = 'Consultar mi QR'; $('#discovery-action').href='#account'; }
 }
 if ($('#logout')) $('#logout').onclick = logout;
}
async function access(event) {
  event.preventDefault();
  if (busy) return;
  const form = event.currentTarget, mode = event.submitter?.value || 'register';
  const data = new FormData(form), phone = data.get('phone'), name = data.get('name').trim();
  if (mode === 'register' && name.length < 2) {
    message('Escribe tu nombre para registrarte.'); $('#access-name').focus(); return;
  }
  busy = true;
  form.querySelectorAll('button').forEach(button => button.disabled = true);
  try {
    await api(mode, {name, phone, recovery:phone.slice(-4)});
    accessDraft.name = ''; accessDraft.phone = '';
    const refreshed = await load();
    message(!refreshed ? 'Entraste. Pulsa Actualizar para ver tu cuenta.' : state.mine ? 'Este es tu premio confirmado.' : state.validation ? selected ? 'Confirma tu premio.' : 'Tus puntos están comprobados. Elige tu premio.' : 'Listo. Junta 10 puntos y valida en barra.');
    if (poster && state?.person && !state.reservation) await savePoster();
  } catch (error) {
    if (error.code === 'phone_taken') {
      message('Este celular ya tiene cuenta. Toca «Consultar mi QR».');
      form.querySelector('[value="login"]')?.focus();
    } else message(error.message, true);
  }
  finally {
    busy = false;
    if (form.isConnected) form.querySelectorAll('button').forEach(button => button.disabled = false);
    $('#refresh').disabled = false;
    if (state) render();
  }
}
async function logout() {
  if (busy) return;
  busy = true;
  try {
    await api('logout', {}); clearSelection(); accessKey = null;
    message('Saliste de tu cuenta.'); await load({explicitLogout:true});
  } catch (error) { message(error.message, true); }
  finally { busy = false; $('#refresh').disabled = false; if (state) render(); }
}
$('#prizes').onclick = event => {
  const button = event.target.closest('[data-prize]');
  if (!button || button.disabled || busy || !state) return;
  if (!state.person || !state.reservation) { message('Guarda primero el QR con tu celular.', true); $('#account').scrollIntoView(); return; }
  if (!state.validation) { message('Junta 10 puntos y trae tus stickers físicos para comprobarlos.', true); return; }
  selected = button.dataset.prize;
  message('Tu selección aún no está reservada.'); render();
  $('#claim-form').scrollIntoView();
};
$('#cancel-selection').onclick = () => { clearSelection(); message('Puedes elegir otro premio disponible.'); render(); $('#prizes button:not(:disabled)')?.focus(); };
$('#claim-form').onsubmit = async event => {
  event.preventDefault();
  if (busy || !selected || !state?.person) return;
  busy = true;
  const button = event.currentTarget.querySelector('[type="submit"]');
  const original = button.textContent;
  button.disabled = true; button.textContent = 'Confirmando…';
  $('#cancel-selection').disabled = true; $('#refresh').disabled = true;
  try {
    const code = new FormData(event.currentTarget).get('code').trim().toUpperCase();
    await api('reward-claim', {id:selected, poster, code});
    clearSelection();
    message('Premio confirmado. Ya está reservado para ti.', true);
    await load();
  } catch (error) {
    message(error.message, true);
    const refreshed = await load({quiet:true});
    if (refreshed && state?.mine) message('Tu premio ya está confirmado. La conexión se interrumpió al responder, pero tu reserva quedó guardada.', true);
  }
  finally {
    busy = false; button.disabled = false; button.textContent = original;
    $('#cancel-selection').disabled = false; $('#refresh').disabled = false;
    if (state) render();
  }
};
$('#refresh').onclick = async () => { message(''); await load(); };
load();
if (new URLSearchParams(location.hash.slice(1)).has('boleto')) {
  message('La dinámica cambió: junta 10 puntos físicos y valídalos en barra. Para elegir premio, escanea un cartel.');
}
renderDiscovery();
setInterval(() => {
  const activeForm = document.activeElement?.closest('form');
  if (document.visibilityState === 'visible' && !busy && !activeForm && !selected) load({quiet:true});
}, 20000);
