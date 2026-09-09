export const LOYALTY_API = "https://tareascontrol.netlify.app/api";

export async function initEnrollment({ root, setStatus, onSession, onMode }) {
  const mount = root.querySelector('[data-enrollment-root]');
  const legacy = root.querySelector('[data-portal-form]');
  if (!mount || !legacy) return;
  legacy.hidden = true;
  const request = async (endpoint, body) => {
    const response = await fetch(`${LOYALTY_API}/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), credentials: 'omit', referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(20000)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No pudimos completar la solicitud. Intenta de nuevo.');
    return data;
  };
  try {
    const response = await fetch(`${LOYALTY_API}/loyalty-enrollment-auth?action=status`, {
      credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(10000)
    });
    // Compatibility with the older backend while the coordinated release is staged.
    if (response.status === 404 || response.status === 405) { onMode(false); legacy.hidden = false; return; }
    if (!response.ok) throw new Error('No pudimos verificar la disponibilidad. Recarga para reintentar.');
    const status = await response.json();
    if (typeof status.emailVerificationRequired !== 'boolean') throw new Error('Servicio temporalmente no disponible.');
    onMode(status.emailVerificationRequired);
    if (!status.emailVerificationRequired) { legacy.hidden = false; return; }
    if (!status.registrationAvailable) throw new Error('El acceso por correo no está disponible por ahora. Solicita apoyo en sucursal.');
  } catch (error) { setStatus(error.message || 'Servicio temporalmente no disponible.', 'error'); return; }

  const heading = root.querySelector('#lookup-title');
  if (heading) heading.textContent = 'Tu cuenta Better Mood';
  const headingText = heading?.parentElement.querySelector('p');
  if (headingText) headingText.textContent = 'Recibe un código en tu correo para continuar.';
  const intro = root.querySelector('.rewards-hero__intro > p');
  if (intro) intro.textContent = 'Regístrate o consulta tus beneficios con tu teléfono y correo verificado.';
  const sheet = document.createElement('link'); sheet.rel = 'stylesheet'; sheet.href = '/recompensas/enrollment.css'; document.head.append(sheet);
  mount.innerHTML = `
    <form class="enrollment-form" data-enrollment-form>
      <fieldset class="enrollment-modes"><legend class="enrollment-sr">Acceso a tu cuenta</legend>
        <label><input type="radio" name="mode" value="register" checked>Registrarme</label>
        <label><input type="radio" name="mode" value="login">Ya tengo cuenta</label>
      </fieldset>
      <fieldset data-enrollment-fields>
        <label class="rewards-field" data-register-only><span>Nombre</span><input name="name" autocomplete="name" maxlength="100" required></label>
        <label class="rewards-field"><span>Teléfono con código de país</span><input name="phone" type="tel" autocomplete="tel" placeholder="+52 222 123 4567" maxlength="24" required></label>
        <label class="rewards-field"><span>Correo electrónico</span><input name="email" type="email" autocomplete="email" maxlength="254" required></label>
        <div class="enrollment-birthday" data-register-only>
          <label class="rewards-field"><span>Día de cumpleaños</span><input name="birthdayDay" type="number" inputmode="numeric" min="1" max="31" required></label>
          <label class="rewards-field"><span>Mes</span><select name="birthdayMonth" required><option value="">Seleccionar</option>${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((name,index)=>`<option value="${index+1}">${name}</option>`).join('')}</select></label>
        </div>
        <label class="enrollment-check" data-register-only><input name="privacyAccepted" type="checkbox" required><span>Acepto el <a href="/aviso-privacidad.html" target="_blank" rel="noopener noreferrer">aviso de privacidad</a> para registrar mi cuenta.</span></label>
        <label class="enrollment-check" data-register-only><input name="marketingAccepted" type="checkbox"><span>Quiero recibir promociones por correo. Opcional.</span></label>
      </fieldset>
      <div data-code-fields hidden><label class="rewards-field"><span>Código de 6 dígitos</span><input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" disabled></label><p data-code-destination></p></div>
      <div class="enrollment-actions"><button class="button button--primary" type="submit" data-enrollment-submit>Enviar código</button><button class="button button--outline" type="button" data-enrollment-restart hidden>Cambiar datos</button></div>
    </form>
    <div class="enrollment-pending" data-enrollment-pending hidden><p>Para proteger tu cuenta, pide al administrador en sucursal que confirme la vinculación de este correo. No hemos cambiado tu saldo ni tu tarjeta.</p><button class="button button--primary" type="button" data-enrollment-check>Ya confirmaron mi correo</button><button class="button button--outline" type="button" data-enrollment-new>Volver a empezar</button></div>
    <button class="button button--outline" type="button" data-enrollment-signout hidden>Cerrar consulta</button>`;
  mount.hidden = false;
  const form = mount.querySelector('form');
  const fields = mount.querySelector('[data-enrollment-fields]');
  const modeFields = mount.querySelector('.enrollment-modes');
  const codeFields = mount.querySelector('[data-code-fields]');
  const codeInput = form.elements.code;
  const submit = mount.querySelector('[data-enrollment-submit]');
  const restart = mount.querySelector('[data-enrollment-restart]');
  const pending = mount.querySelector('[data-enrollment-pending]');
  const signout = mount.querySelector('[data-enrollment-signout]');
  let busy = false, challengeId = '', emailProof = '', enrollment = null, mode = 'register';
  const applyMode = () => {
    mode = form.elements.mode.value;
    mount.querySelectorAll('[data-register-only]').forEach(container => {
      container.hidden = mode !== 'register';
      container.querySelectorAll('input,select').forEach(input=>input.disabled=mode!=='register');
    });
  };
  const setBusy = value => { busy = value; submit.disabled = value; restart.disabled = value; pending.querySelectorAll('button').forEach(button=>button.disabled=value); };
  const reset = () => {
    challengeId = ''; emailProof = ''; enrollment = null;
    form.hidden = false; pending.hidden = true; signout.hidden = true;
    fields.disabled = false; modeFields.disabled = false;
    codeFields.hidden = true; codeInput.disabled = true; codeInput.required = false; codeInput.value = '';
    restart.hidden = true; submit.textContent = 'Enviar código'; applyMode(); setStatus('');
  };
  const login = async () => {
    const session = await request('loyalty-portal', {phone:enrollment.phone,emailProof});
    if (!session.ok || !session.token || !session.customer) throw new Error('No pudimos abrir tu cuenta. Solicita apoyo en sucursal.');
    form.hidden = true; pending.hidden = true; signout.hidden = false;
    emailProof = ''; challengeId = ''; form.reset();
    onSession(session); setStatus('Tu cuenta está lista.', 'success');
  };
  const complete = async () => {
    if (mode === 'register') {
      const result = await request('loyalty-enrollment-auth',{action:'register',emailProof,enrollment});
      if (result.status === 'staff_link_required') { form.hidden = true; pending.hidden = false; setStatus('Vinculación pendiente de confirmación en sucursal.'); return; }
      if (result.status !== 'ready') throw new Error('El registro no quedó confirmado. Intenta nuevamente.');
    }
    await login();
  };
  form.addEventListener('change', event => {
    if (event.target.name !== 'mode') return;
    applyMode();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !form.reportValidity()) return;
    setBusy(true); setStatus('Procesando...');
    try {
      if (!challengeId) {
        const data = new FormData(form);
        let phone = String(data.get('phone') || '').replace(/[\s()-]/g,'');
        if (/^\d{10}$/.test(phone)) phone = `+52${phone}`;
        if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('Revisa tu teléfono e incluye el código de país.');
        enrollment = {name:String(data.get('name')||'').trim(),phone,email:String(data.get('email')||'').trim().toLowerCase(),birthdayDay:Number(data.get('birthdayDay')),birthdayMonth:Number(data.get('birthdayMonth')),privacyAccepted:data.get('privacyAccepted')==='on',marketingAccepted:data.get('marketingAccepted')==='on'};
        if (mode === 'register') {
          const birthday = new Date(Date.UTC(2000,enrollment.birthdayMonth-1,enrollment.birthdayDay));
          if (birthday.getUTCMonth()!==enrollment.birthdayMonth-1 || birthday.getUTCDate()!==enrollment.birthdayDay) throw new Error('Revisa el día y mes de cumpleaños.');
        }
        const result = await request('loyalty-enrollment-auth',{action:'request',email:enrollment.email});
        if (!result.challengeId) throw new Error('No se confirmó el envío del código.');
        challengeId = result.challengeId; fields.disabled = true; modeFields.disabled = true;
        codeFields.hidden = false; codeInput.disabled = false; codeInput.required = true;
        mount.querySelector('[data-code-destination]').textContent = `Enviado a ${enrollment.email}. Vence en 10 minutos.`;
        restart.hidden = false; submit.textContent = 'Verificar y continuar'; codeInput.focus();
        setStatus('Revisa tu correo, incluida la carpeta de spam.');
      } else {
        if (!emailProof) {
          const result = await request('loyalty-enrollment-auth',{action:'verify',challengeId,code:codeInput.value});
          if (!result.emailProof) throw new Error('No se pudo verificar el código.');
          emailProof = result.emailProof;
        }
        await complete();
      }
    } catch (error) { setStatus(error.message || 'No pudimos completar la solicitud.', 'error'); }
    finally { setBusy(false); }
  });
  restart.addEventListener('click',reset);
  mount.querySelector('[data-enrollment-new]').addEventListener('click',reset);
  mount.querySelector('[data-enrollment-check]').addEventListener('click',async()=>{
    if (busy) return; setBusy(true);
    try { await complete(); } catch(error) { setStatus(error.message || 'Solicita un nuevo código para continuar.','error'); } finally {setBusy(false);}
  });
  signout.addEventListener('click',()=>{ root.dispatchEvent(new CustomEvent('enrollment:signout')); reset(); });
}
