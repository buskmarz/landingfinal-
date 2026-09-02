(function () {
  const form = document.querySelector('[data-shots-form]');
  const params = new URLSearchParams(window.location.search);
  const isPublicHost = /^(?:www\.)?bmoodcoffee\.com$/.test(window.location.hostname) || /\.netlify\.(?:app|com)$/.test(window.location.hostname);

  function sessionId() {
    try {
      let value = window.sessionStorage.getItem('bm_session_id') || '';
      if (!value) {
        value = `BM-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        window.sessionStorage.setItem('bm_session_id', value);
      }
      return value;
    } catch (error) {
      return '';
    }
  }

  function track(eventName, cta, meta) {
    if (!isPublicHost) return;
    const payload = JSON.stringify({
      event: eventName,
      cta: cta || 'unknown',
      path: window.location.pathname,
      meta: Object.assign({
        session_id: sessionId(),
        collection_version: 'five_drinks_v1',
        utm_source: params.get('utm_source') || '',
        utm_medium: params.get('utm_medium') || '',
        utm_campaign: params.get('utm_campaign') || '',
        utm_content: params.get('utm_content') || ''
      }, meta || {})
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track-event', new Blob([payload], { type: 'application/json' }));
      return;
    }
    fetch('/api/track-event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
      keepalive: true
    }).catch(function () {});
  }

  document.querySelectorAll('[data-shots-cta]').forEach(function (element) {
    element.addEventListener('click', function () {
      track('mood_shots_cta', element.dataset.shotsCta);
    });
  });

  document.querySelectorAll('[data-product]').forEach(function (element) {
    element.addEventListener('click', function () {
      track('available_product_cta', element.dataset.product, { product: element.dataset.product });
    });
  });

  if (!form) {
    track('mood_shots_view', 'page');
    track('beverage_collection_view', 'page');
    return;
  }

  form.querySelectorAll('[data-utm]').forEach(function (input) {
    input.value = params.get(input.dataset.utm) || '';
  });

  const phone = form.elements.whatsapp;
  const email = form.elements.correo;
  const preference = form.elements.preferencia_contacto;
  const instruction = form.querySelector('[data-contact-instruction]');

  function validateContact() {
    const hasContact = phone.value.trim() || email.value.trim();
    const preferredValue = preference.value === 'WhatsApp' ? phone.value.trim() : preference.value === 'Correo' ? email.value.trim() : hasContact;
    const message = !hasContact ? 'Agrega WhatsApp o correo para que podamos avisarte.' : !preferredValue ? `Agrega tu ${preference.value.toLowerCase()} o cambia la preferencia.` : '';
    phone.setCustomValidity(message);
    if (instruction) {
      instruction.textContent = message || 'Completa WhatsApp, correo o ambos.';
      instruction.classList.toggle('is-error', Boolean(message));
    }
    return !message;
  }

  [phone, email, preference].forEach(function (field) {
    field.addEventListener('input', validateContact);
    field.addEventListener('change', validateContact);
  });

  form.querySelector('[data-shots-branch]')?.addEventListener('change', function (event) {
    if (event.target.value) track('mood_shots_branch_select', 'waitlist', { branch: event.target.value });
  });
  form.querySelectorAll('input[name="favorito"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      track('mood_shots_flavor_select', 'waitlist', { flavor: radio.value });
      track('beverage_select', 'interest_form', {
        product: radio.dataset.productKey || radio.value,
        label: radio.value
      });
    });
  });
  form.addEventListener('submit', function (event) {
    if (!validateContact()) {
      event.preventDefault();
      phone.reportValidity();
      return;
    }
    track('mood_shots_waitlist_submit', 'waitlist', {
      branch: form.elements.sucursal.value,
      flavor: form.elements.favorito.value,
      product: form.querySelector('input[name="favorito"]:checked')?.dataset.productKey || '',
      contact_preference: preference.value
    });
  });

  track('mood_shots_view', 'page');
  track('beverage_collection_view', 'page');
}());
