(function () {
  const root = document.querySelector('[data-event-inquiry]');
  const form = root?.querySelector('[data-event-form]');
  if (!form) return;

  const status = root.querySelector('[data-event-status]');
  const submit = root.querySelector('[data-event-submit]');
  const success = root.querySelector('[data-event-success]');
  const requestId = root.querySelector('[data-event-request-id]');
  const folioInput = root.querySelector('[data-event-folio]');
  const whatsapp = root.querySelector('[data-event-whatsapp]');
  const email = root.querySelector('[data-event-email]');
  const copy = root.querySelector('[data-event-copy-id]');
  const reset = root.querySelector('[data-event-reset]');
  const dateInput = form.elements.date;
  let savedFolio = '';
  let started = false;

  function updateSubmitLabel() {
    const channel = form.querySelector('[name="preferredContact"]:checked')?.value || 'whatsapp';
    form.elements.phone.required = channel === 'whatsapp';
    form.elements.email.required = channel === 'email';
    submit.textContent = channel === 'email' ? 'Guardar y abrir correo' : 'Guardar y abrir WhatsApp';
  }

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
  dateInput.min = today;

  function track(eventName, cta) {
    const host = window.location.hostname.toLowerCase();
    const isPublic = host === 'bmoodcoffee.com' || host === 'www.bmoodcoffee.com' || /\.netlify\.(app|com)$/.test(host);
    if (!isPublic) return;
    const body = JSON.stringify({ event: eventName, cta: cta || '', path: window.location.pathname });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/track-event', new Blob([body], { type: 'application/json' }));
    else fetch('/api/track-event', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(function () {});
  }

  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state || 'neutral';
  }

  form.addEventListener('focusin', function () {
    if (started) return;
    started = true;
    track('event_form_start', 'event-form');
  });

  form.querySelectorAll('[name="setup"]').forEach(function (input) {
    input.addEventListener('change', function () { track('event_setup_select', `setup-${input.value}`); });
  });
  form.querySelectorAll('[name="preferredContact"]').forEach(function (input) {
    input.addEventListener('change', function () {
      updateSubmitLabel();
      track('event_contact_select', `contact-${input.value}`);
    });
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!form.reportValidity()) {
      setStatus('Revisa los campos marcados.', 'error');
      track('event_form_error', 'validation');
      return;
    }

    const data = new FormData(form);
    const payload = {
      setup: String(data.get('setup') || ''),
      date: String(data.get('date') || ''),
      time: String(data.get('time') || ''),
      guests: Number.parseInt(String(data.get('guests') || '0'), 10),
      venue: String(data.get('venue') || '').trim(),
      name: String(data.get('name') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      email: String(data.get('email') || '').trim(),
      preferredContact: String(data.get('preferredContact') || 'whatsapp'),
      details: String(data.get('details') || '').trim(),
      privacyAccepted: data.get('privacyAccepted') === 'on',
      website: String(data.get('website') || ''),
      source: 'eventos-page'
    };

    let handoffWindow = null;
    if (payload.preferredContact === 'whatsapp') {
      handoffWindow = window.open('', 'better-mood-event-contact');
      if (handoffWindow) {
        handoffWindow.document.title = 'Abriendo WhatsApp…';
        handoffWindow.document.body.textContent = 'Abriendo WhatsApp…';
        handoffWindow.opener = null;
      }
    }

    submit.disabled = true;
    setStatus('Guardando solicitud…', 'neutral');
    try {
      const response = await fetch('/api/catering', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(result.error || 'No pudimos guardar la solicitud.');

      savedFolio = String(result.folio || result.requestId || 'BM-EVT');
      folioInput.value = savedFolio;
      requestId.textContent = savedFolio;
      const notificationData = new URLSearchParams();
      notificationData.set('form-name', 'cafe-eventos');
      notificationData.set('folio', savedFolio);
      Object.entries(payload).forEach(function ([key, value]) {
        notificationData.set(key, typeof value === 'boolean' ? String(value) : String(value ?? ''));
      });
      let notificationSent = false;
      try {
        const notificationResponse = await fetch('/eventos/', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: notificationData.toString()
        });
        notificationSent = notificationResponse.ok;
      } catch (_notificationError) {}
      const setupLabel = payload.setup === 'espresso' ? 'barra de espresso' : payload.setup === 'precoladora' ? 'precoladora' : 'formato por definir';
      const message = `Hola Better Mood. Guardé la solicitud ${savedFolio} para ${payload.guests} personas el ${payload.date}, ${setupLabel}.`;
      whatsapp.href = `https://wa.me/522221252321?text=${encodeURIComponent(message)}`;
      email.href = `mailto:bettermoodcoffee@gmail.com?subject=${encodeURIComponent(`Solicitud ${savedFolio}`)}&body=${encodeURIComponent(message)}`;
      whatsapp.hidden = !payload.phone;
      email.hidden = !payload.email;
      setStatus(notificationSent ? 'Solicitud guardada y notificada.' : `Solicitud guardada con folio ${savedFolio}. Continúa por WhatsApp o correo.`, 'success');
      form.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      track('event_form_submit_success', 'event-submit');
      if (!notificationSent) track('event_notification_error', 'event-netlify-form');
      if (payload.preferredContact === 'email') {
        window.location.href = email.href;
      } else if (handoffWindow && !handoffWindow.closed) {
        handoffWindow.location.href = whatsapp.href;
        track('event_whatsapp_click', 'event-whatsapp-auto');
      }
    } catch (error) {
      if (handoffWindow && !handoffWindow.closed) handoffWindow.close();
      setStatus(error.message || 'No pudimos guardar la solicitud.', 'error');
      track('event_form_error', 'storage');
    } finally {
      submit.disabled = false;
    }
  });

  whatsapp.addEventListener('click', function () { track('event_whatsapp_click', 'event-whatsapp'); });
  email.addEventListener('click', function () { track('event_email_click', 'event-email'); });
  copy.addEventListener('click', async function () {
    if (!savedFolio) return;
    try {
      await navigator.clipboard.writeText(savedFolio);
      copy.textContent = 'Folio copiado';
    } catch (_error) {
      copy.textContent = savedFolio;
    }
  });
  reset.addEventListener('click', function () {
    form.reset();
    dateInput.min = today;
    form.hidden = false;
    success.hidden = true;
    savedFolio = '';
    folioInput.value = '';
    copy.textContent = 'Copiar folio';
    setStatus('Esto no reserva ni confirma disponibilidad.', 'neutral');
    updateSubmitLabel();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  updateSubmitLabel();
})();
