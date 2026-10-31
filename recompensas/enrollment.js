// Keep enrollment on the branded origin so the browser does not need a cross-origin preflight.
export const LOYALTY_API = "/sistema/api";

export async function initEnrollment({ root, setStatus, onSession, onMode, restoreSession }) {
  const mount = root.querySelector('[data-enrollment-root]');
  const legacy = root.querySelector('[data-portal-form]');
  if (!mount || !legacy) return;
  legacy.hidden = true;
  const page = root.ownerDocument || document;
  const applyProgramCopy = active => {
    root.dataset.loyaltyProgram = active ? 'hybrid' : 'legacy';
    page.querySelectorAll('[data-program-copy]').forEach(node => {
      const copy = node.getAttribute(active ? 'data-copy-hybrid' : 'data-copy-legacy');
      if (copy) node.textContent = copy;
    });
  };
  applyProgramCopy(false);
  const request = async (endpoint, body) => {
    const response = await fetch(`${LOYALTY_API}/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), credentials: 'omit', referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(20000)
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'No pudimos completar la solicitud. Intenta de nuevo.');
      error.code = data.code; error.status = response.status;
      throw error;
    }
    return data;
  };
  try {
    const response = await fetch(`${LOYALTY_API}/loyalty-enrollment-auth?action=status`, {
      credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(10000)
    });
    // Compatibility with the older backend while the coordinated release is staged.
    if (response.status === 404 || response.status === 405) { applyProgramCopy(false); onMode(false); legacy.hidden = false; return; }
    if (!response.ok) throw new Error('No pudimos verificar la disponibilidad. Recarga para reintentar.');
    const status = await response.json();
    if (typeof status.emailVerificationRequired !== 'boolean') throw new Error('Servicio temporalmente no disponible.');
    applyProgramCopy(status.hybridProgramActive === true);
    onMode(status.emailVerificationRequired);
    if (!status.emailVerificationRequired) { legacy.hidden = false; return; }
    if (!status.registrationAvailable) throw new Error('El acceso por correo no está disponible por ahora. Solicita apoyo en sucursal.');
  } catch (error) { setStatus(error.message || 'Servicio temporalmente no disponible.', 'error'); return; }

  const heading = root.querySelector('#lookup-title');
  if (heading) heading.textContent = 'Tu cuenta Rewards';
  const headingText = heading?.parentElement.querySelector('p');
  if (headingText) headingText.textContent = 'Recibe un código en tu correo para continuar.';
  const sheet = document.createElement('link'); sheet.rel = 'stylesheet'; sheet.href = '/recompensas/enrollment.css?v=20261030-rewards'; document.head.append(sheet);
  mount.innerHTML = `
    <form class="enrollment-form" data-enrollment-form>
      <fieldset class="enrollment-modes"><legend class="enrollment-sr">Acceso a tu cuenta</legend>
        <label><input type="radio" name="mode" value="register"><span>Únete</span></label>
        <label><input type="radio" name="mode" value="login" checked><span>Inicia sesión</span></label>
      </fieldset>
      <fieldset data-enrollment-fields>
        <label class="rewards-field" data-register-only><span>Nombre</span><input name="name" autocomplete="name" maxlength="100" required></label>
        <div class="enrollment-phone">
          <label class="rewards-field"><span>País / código</span><select name="countryCode" autocomplete="tel-country-code"><option value="52">México (+52)</option><option value="1">EE. UU. / Canadá (+1)</option><option value="57">Colombia (+57)</option><option value="54">Argentina (+54)</option><option value="51">Perú (+51)</option><option value="56">Chile (+56)</option><option value="34">España (+34)</option><option value="other">Otro país</option></select></label>
          <label class="rewards-field"><span>Celular</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="10 dígitos" maxlength="24" required aria-describedby="phone-help"></label>
          <label class="rewards-field" data-country-custom hidden><span>Código de país</span><input name="customCountryCode" type="tel" inputmode="tel" placeholder="Ej. +44" maxlength="4" disabled></label>
          <p class="enrollment-phone-note" id="phone-help">Escribe los 10 dígitos, sin +52.</p>
        </div>
        <label class="rewards-field"><span>Correo electrónico</span><input name="email" type="email" autocomplete="email" maxlength="254" required></label>
        <fieldset class="enrollment-birthday" data-register-only><legend>Fecha de nacimiento <span>(opcional)</span></legend>
          <label class="rewards-field"><span>Día</span><input name="birthdayDay" type="number" inputmode="numeric" min="1" max="31"></label>
          <label class="rewards-field"><span>Mes</span><select name="birthdayMonth"><option value="">Seleccionar</option>${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((name,index)=>`<option value="${index+1}">${name}</option>`).join('')}</select></label><p class="enrollment-birthday-note">Solo día y mes. Puedes dejarlos en blanco.</p>
        </fieldset>
        <label class="enrollment-check" data-register-only><input name="privacyAccepted" type="checkbox" required><span>Acepto el <a href="/aviso-privacidad.html" target="_blank" rel="noopener noreferrer">aviso de privacidad</a> para registrar mi cuenta.</span></label>
        <label class="enrollment-check" data-register-only><input name="marketingAccepted" type="checkbox"><span>Quiero recibir promociones por correo. Opcional.</span></label>
      </fieldset>
      <div data-code-fields hidden><label class="rewards-field"><span>Código de tu correo</span><input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" disabled></label><p data-code-destination></p></div>
      <div class="enrollment-actions"><button class="button button--primary" type="submit" data-enrollment-submit>Enviar código</button><button class="button button--outline" type="button" data-enrollment-restart hidden>Cambiar datos</button></div>
    </form>
    <button class="button button--outline" type="button" data-enrollment-link hidden>Activar mi acceso</button>
    <div class="enrollment-pending" data-enrollment-pending hidden><p>Ya tienes una cuenta. En caja confirmarán tu correo para conservar tu saldo y tu tarjeta.</p><button class="button button--primary" type="button" data-enrollment-check>Ya confirmaron mi correo</button><button class="button button--outline" type="button" data-enrollment-new>Volver a empezar</button></div>
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
  const linkAccount = mount.querySelector('[data-enrollment-link]');
  let busy = false, challengeId = '', emailProof = '', enrollment = null, mode = 'register';
  const readBirthday = data => {
    const dayText = String(data.get('birthdayDay') || '').trim();
    const monthText = String(data.get('birthdayMonth') || '').trim();
    if (!dayText && !monthText) return {birthdayDay:undefined,birthdayMonth:undefined};
    const birthdayDay = Number(dayText), birthdayMonth = Number(monthText);
    const date = new Date(Date.UTC(2000,birthdayMonth-1,birthdayDay));
    if (!dayText || !monthText || !Number.isInteger(birthdayDay) || !Number.isInteger(birthdayMonth) || birthdayMonth<1 || birthdayMonth>12 || birthdayDay<1 || date.getUTCMonth()!==birthdayMonth-1 || date.getUTCDate()!==birthdayDay) throw new Error('Completa el día y mes de nacimiento, o deja ambos en blanco.');
    return {birthdayDay,birthdayMonth};
  };
  const country = form.elements.countryCode;
  const customCountry = form.elements.customCountryCode;
  const applyCountry = () => {
    const other = country.value === 'other';
    mount.querySelector('[data-country-custom]').hidden = !other;
    customCountry.disabled = !other; customCountry.required = other;
    form.elements.phone.placeholder = country.value === '52' ? '10 dígitos' : 'Número local';
    mount.querySelector('#phone-help').textContent = country.value === '52' ? 'Escribe los 10 dígitos, sin +52.' : 'Escribe el número sin el código de país.';
  };
  const readPhone = data => {
    const prefix = String(country.value === 'other' ? data.get('customCountryCode') || '' : country.value).trim().replace(/^\+/, '');
    let national = String(data.get('phone') || '').replace(/[\s()-]/g,'');
    if (!/^[1-9]\d{0,2}$/.test(prefix)) throw new Error('Revisa el código de país.');
    // Allow a complete number pasted by the user or phone autofill, without doubling its prefix.
    if (national.startsWith('+')) {
      if (!national.startsWith(`+${prefix}`)) throw new Error('Elige el país que corresponde a tu número.');
      national = national.slice(prefix.length+1);
    }
    if (prefix === '52' && !/^\d{10}$/.test(national)) throw new Error('Escribe los 10 dígitos de tu celular.');
    const phone = `+${prefix}${national}`;
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('Revisa tu número de celular.');
    return phone;
  };
  country.addEventListener('change',applyCountry);
  applyCountry();
  const applyMode = () => {
    mode = form.elements.mode.value;
    if (heading) heading.textContent = mode === 'register' ? 'Únete a Rewards' : 'Inicia sesión';
    mount.querySelectorAll('[data-register-only]').forEach(container => {
      container.hidden = mode !== 'register';
      container.querySelectorAll('input,select').forEach(input=>input.disabled=mode!=='register');
    });
  };
  const setBusy = value => { busy = value; submit.disabled = value; restart.disabled = value; pending.querySelectorAll('button').forEach(button=>button.disabled=value); };
  const reset = () => {
    challengeId = ''; emailProof = ''; enrollment = null;
    form.hidden = false; pending.hidden = true; signout.hidden = true;
    linkAccount.hidden = true;
    fields.disabled = false; modeFields.disabled = false;
    form.elements.phone.readOnly = false; form.elements.email.readOnly = false;
    country.disabled = false; customCountry.readOnly = false; applyCountry();
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
        const phone = readPhone(data);
        enrollment = {name:String(data.get('name')||'').trim(),phone,email:String(data.get('email')||'').trim().toLowerCase(),...readBirthday(data),privacyAccepted:data.get('privacyAccepted')==='on',marketingAccepted:data.get('marketingAccepted')==='on'};
        const result = await request('loyalty-enrollment-auth',{action:'request',email:enrollment.email});
        if (!result.challengeId) throw new Error('No se confirmó el envío del código.');
        challengeId = result.challengeId; fields.disabled = true; modeFields.disabled = true;
        codeFields.hidden = false; codeInput.disabled = false; codeInput.required = true;
        mount.querySelector('[data-code-destination]').textContent = `Enviado a ${enrollment.email}. Vence en 10 minutos.`;
        restart.hidden = false; submit.textContent = 'Entrar a mi cuenta'; codeInput.focus();
        setStatus('Revisa tu correo, incluida la carpeta de spam.');
      } else {
        if (emailProof && mode === 'register' && !fields.disabled) {
          const data = new FormData(form);
          enrollment = {...enrollment, name:String(data.get('name')||'').trim(),
            ...readBirthday(data),
            privacyAccepted:data.get('privacyAccepted')==='on',marketingAccepted:data.get('marketingAccepted')==='on'};
        }
        if (!emailProof) {
          const result = await request('loyalty-enrollment-auth',{action:'verify',challengeId,code:codeInput.value});
          if (!result.emailProof) throw new Error('No se pudo verificar el código.');
          emailProof = result.emailProof;
        }
        await complete();
      }
    } catch (error) {
      if (emailProof && mode === 'login' && error.code === 'account_not_linked') linkAccount.hidden = false;
      if (error.status === 401 && emailProof) { reset(); setStatus('Tu código venció. Solicita uno nuevo para continuar.', 'error'); return; }
      if (error.status === 401) { codeInput.value = ''; codeInput.focus(); }
      setStatus(error.message || 'No pudimos completar la solicitud.', 'error');
    }
    finally { setBusy(false); }
  });
  restart.addEventListener('click',reset);
  mount.querySelector('[data-enrollment-new]').addEventListener('click',reset);
  mount.querySelector('[data-enrollment-check]').addEventListener('click',async()=>{
    if (busy) return; setBusy(true);
    try { await complete(); } catch(error) { if (error.status === 401) reset(); setStatus(error.status === 401 ? 'Tu código venció. Solicita uno nuevo.' : error.message || 'Solicita un nuevo código para continuar.','error'); } finally {setBusy(false);}
  });
  signout.addEventListener('click',()=>{ root.dispatchEvent(new CustomEvent('enrollment:signout')); reset(); });
  // A verified existing email can finish enrollment without asking for another code.
  linkAccount.addEventListener('click', () => {
    linkAccount.hidden = true;
    form.elements.mode.value = 'register'; applyMode();
    fields.disabled = false; modeFields.disabled = true;
    form.elements.phone.readOnly = true; form.elements.email.readOnly = true;
    country.disabled = true; customCountry.readOnly = true;
    codeFields.hidden = true; codeInput.required = false;
    submit.textContent = 'Activar mi acceso';
    setStatus('Completa tus datos. Tu correo ya está verificado.');
    form.elements.name.focus();
  });
  page.querySelectorAll('[data-enrollment-mode]').forEach(button => button.addEventListener('click', () => {
    if (busy || challengeId || emailProof || form.hidden) return;
    form.elements.mode.value = button.dataset.enrollmentMode; applyMode();
  }));
  applyMode();
  if (restoreSession && await restoreSession()) {
    form.hidden = true; signout.hidden = false;
    setStatus('Tu cuenta está abierta.', 'success');
  }
}
