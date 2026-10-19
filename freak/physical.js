const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state, selected = null, busy = false, loading = false, accessKey = null;
let poster = new URLSearchParams(location.hash.slice(1)).get('premio') || '';
const accessDraft = {name:'', phone:''};
window.addEventListener('hashchange', () => {
  // Changing or removing the fragment must also remove the old poster credential.
  poster = new URLSearchParams(location.hash.slice(1)).get('premio') || '';
  if (!poster && selected) {
    clearSelection();
    if (state) render();
    message('Para elegir, escanea de nuevo un cartel de premios.');
  }
  if (poster) $('#premios').scrollIntoView();
});
// Keep the scanned poster while moving between sections on this page.
for (const link of document.querySelectorAll('a[href^="#"]')) {
  link.addEventListener('click', event => {
    if (!poster) return;
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (target) { event.preventDefault(); target.scrollIntoView(); }
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
async function load({quiet = false} = {}) {
  if (loading) return;
  loading = true;
  $('#refresh').disabled = true;
  try {
    const next = await api('rewards');
    if (!Array.isArray(next.prizes)) throw Error('No pudimos leer los premios. Intenta de nuevo.');
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
  const available = state.prizes.filter(p => !p.taken).length;
  $('#prize-status').textContent = state.prizes.length === 0 ? 'Los premios aún no están disponibles. Consulta al equipo en barra.' : available === 0 ? 'Todos los premios ya fueron elegidos.' : available === 1 ? 'Queda 1 premio disponible.' : `${available} premios disponibles.`;
  $('#prizes').innerHTML = state.prizes.map(p => `<article class="prize ${p.taken ? 'taken' : ''} ${p.id === selected ? 'selected' : ''}"><small>${p.taken ? 'YA ELEGIDO' : p.id === selected ? 'TU SELECCIÓN · SIN RESERVAR' : 'DISPONIBLE'}</small><h3>${escape(p.title)}</h3><button data-prize="${escape(p.id)}" aria-label="${p.taken ? 'Ya elegido' : 'Elegir'}: ${escape(p.title)}" aria-pressed="${p.id === selected}" ${p.taken || state.mine || busy ? 'disabled' : ''}>${p.taken ? 'Ya elegido' : p.id === selected ? 'Seleccionado' : 'Elegir premio'}</button></article>`).join('');
  $('#claim-form').hidden = !selected || !state.person || !!state.mine;
  if (selected) $('#selection').textContent = 'Elegiste: ' + state.prizes.find(p => p.id === selected).title;
  const key = state.mine ? `mine:${state.mine.id}:${!!state.mine.delivered_at}` : state.person ? `person:${state.person.name}:${state.validation?.points || 0}:${!!selected}` : 'guest';
  // Polling updates availability without replacing an active form or its inputs.
  if (accessKey === key) return;
  accessKey = key;
  if (state.mine) {
    $('#account').innerHTML = `<div class="account-card"><p class="eyebrow">${state.mine.delivered_at ? 'ENTREGA REGISTRADA' : 'PREMIO CONFIRMADO'}</p><h3>${escape(state.mine.title)}</h3><p>${state.mine.delivered_at ? 'El equipo registró tu entrega.' : 'Ya está reservado para ti. Presenta tu código de barra al equipo para coordinar la entrega.'}</p><button id="logout" class="secondary" type="button">Salir de mi cuenta</button></div>`;
  } else if (state.person) {
    $('#account').innerHTML = `<div class="account-header"><p>Hola, <strong>${escape(state.person.name)}</strong>.</p><button id="logout" class="secondary" type="button">Salir</button></div><div class="points-status"><strong>${state.validation ? escape(state.validation.points) + ' puntos validados' : 'Meta: 10 puntos'}</strong><small>${state.validation ? 'Registrados por el equipo. Conserva tu código de barra.' : 'Aún sin validar. Trae tus stickers a barra.'}</small></div><p class="fine-print">${!available ? 'Ya no quedan premios disponibles.' : selected ? 'Confirma abajo con tu código de barra.' : state.validation ? 'Tus puntos están validados. Escanea un cartel para elegir tu premio.' : 'Valida tus 10 puntos en barra. Después, escanea un cartel para elegir.'}</p>`;
  } else {
    $('#account').innerHTML = `<form id="access"><p class="eyebrow">TU ACCESO</p><h3>Entra con tu celular</h3><p>Hazlo antes de validar tus puntos en barra.</p><label for="access-name">Nombre <span class="fine-print">(solo al registrarte)</span></label><input id="access-name" name="name" minlength="2" maxlength="60" autocomplete="given-name" value="${escape(accessDraft.name)}"><label for="access-phone">Celular</label><input id="access-phone" name="phone" type="tel" inputmode="numeric" pattern="[0-9]{10}" minlength="10" maxlength="10" autocomplete="tel-national" required placeholder="10 dígitos" value="${escape(accessDraft.phone)}"><div class="form-actions"><button class="button" name="mode" value="register">Registrarme</button><button class="secondary" name="mode" value="login">Ya tengo cuenta</button></div><small>Vuelve con el mismo celular. Sin SMS. <a href="/privacidad/">Privacidad</a></small></form>`;
    $('#access').oninput = event => { accessDraft[event.target.name] = event.target.value; };
    $('#access').onsubmit = access;
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
    message(!refreshed ? 'Entraste. Pulsa Actualizar para ver tu cuenta.' : state.mine ? 'Este es tu premio confirmado.' : state.validation ? selected ? 'Confirma con tu código de barra.' : 'Tus puntos ya están validados. Escanea un cartel para elegir.' : 'Tu cuenta está lista. Junta 10 puntos y valídalos en barra.');
    if (selected && state?.person) $('#bar-code').focus();
  } catch (error) {
    if (error.code === 'phone_taken') {
      message('Este celular ya tiene cuenta. Pulsa «Ya tengo cuenta».');
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
    message('Saliste de tu cuenta.'); await load();
  } catch (error) { message(error.message, true); }
  finally { busy = false; $('#refresh').disabled = false; if (state) render(); }
}
$('#prizes').onclick = event => {
  const button = event.target.closest('[data-prize]');
  if (!button || button.disabled || busy || !state) return;
  if (!poster) { message('Para elegir, escanea el QR de uno de los carteles. Los stickers no llevan QR.', true); return; }
  selected = button.dataset.prize;
  message('Tu selección aún no está reservada.'); render();
  if (state.person) $('#bar-code').focus(); else $('#access-name').focus();
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
if (poster) $('#premios').scrollIntoView();
setInterval(() => {
  const activeForm = document.activeElement?.closest('form');
  if (document.visibilityState === 'visible' && !busy && !activeForm && !selected) load({quiet:true});
}, 20000);
