(function () {
  const header = document.querySelector('[data-header]');
  const nav = document.querySelector('[data-nav]');
  const navToggle = document.querySelector('[data-nav-toggle]');
  const form = document.querySelector('[data-b2b-form]');
  const pageParams = new URLSearchParams(window.location.search);

  function getSessionId() {
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

  function getReferrerHost() {
    try { return document.referrer ? new URL(document.referrer).hostname : ''; }
    catch (error) { return ''; }
  }

  const sessionId = getSessionId();

  function isPublicHost() {
    const host = window.location.hostname.toLowerCase();
    return host === 'bmoodcoffee.com' || host === 'www.bmoodcoffee.com' || /\.netlify\.(app|com)$/.test(host);
  }

  function track(eventName, cta, meta) {
    if (!isPublicHost()) return;
    const payload = JSON.stringify({
      event: eventName,
      cta: cta || 'unknown',
      path: window.location.pathname,
      meta: Object.assign({
        session_id: sessionId,
        referrer_host: getReferrerHost(),
        utm_source: pageParams.get('utm_source') || '',
        utm_medium: pageParams.get('utm_medium') || '',
        utm_campaign: pageParams.get('utm_campaign') || ''
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

  navToggle?.addEventListener('click', function () {
    const open = navToggle.getAttribute('aria-expanded') !== 'true';
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    nav?.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
  });

  nav?.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      navToggle?.setAttribute('aria-expanded', 'false');
      nav?.classList.remove('is-open');
      document.body.classList.remove('nav-open');
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !nav?.classList.contains('is-open')) return;
    nav.classList.remove('is-open');
    document.body.classList.remove('nav-open');
    navToggle?.setAttribute('aria-expanded', 'false');
    navToggle?.setAttribute('aria-label', 'Abrir menú');
    navToggle?.focus();
  });

  function updateHeader() { header?.classList.toggle('is-scrolled', window.scrollY > 20); }
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -36px' });
    reveals.forEach(function (element) { observer.observe(element); });
  } else {
    reveals.forEach(function (element) { element.classList.add('is-visible'); });
  }

  document.querySelectorAll('[data-event]').forEach(function (element) {
    element.addEventListener('click', function () {
      track(element.dataset.event, element.dataset.cta);
    });
  });

  if (!form) return;

  const referrer = form.querySelector('[data-referrer]');
  const leadId = form.querySelector('[data-lead-id]');
  const params = pageParams;
  const email = form.querySelector('[data-email]');
  const emailRequired = form.querySelector('[data-email-required]');
  const contactPreference = form.querySelector('[data-contact-preference]');

  function syncEmailRequirement() {
    const required = contactPreference?.value === 'correo';
    if (email) email.required = required;
    if (emailRequired) emailRequired.hidden = !required;
  }

  contactPreference?.addEventListener('change', syncEmailRequirement);
  syncEmailRequirement();

  function setLeadContext() {
    form.querySelectorAll('[data-utm]').forEach(function (field) {
      field.value = params.get(field.dataset.utm) || '';
    });
    if (referrer) referrer.value = document.referrer || '';
    if (leadId) leadId.value = `B2B-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  setLeadContext();
  track('b2b_page_view', 'b2b-page', { lead_id: leadId?.value || '' });

  let formStarted = false;
  form.addEventListener('input', function () {
    if (formStarted) return;
    formStarted = true;
    track('b2b_form_start', 'b2b-form');
  }, { once: true });

  function scoreLead(data) {
    let score = 0;
    if (['cafeteria', 'hotel', 'restaurante'].includes(data.get('business_type'))) score += 2;
    else if (data.get('business_type') === 'oficina-catering') score += 1;

    const consumption = data.get('monthly_consumption');
    if (['31-60kg', '61kg-mas'].includes(consumption) || data.get('locations_count') === '4-mas') score += 2;
    else if (consumption && consumption !== 'por-definir') score += 1;

    const budget = data.get('monthly_budget_status');
    if (budget === 'asignado') score += 2;
    else if (budget === 'necesita-cotizacion') score += 1;
    if (data.get('purchase_timing') === 'este-mes') score += 1;

    return { score: score, tier: score >= 6 ? 'A' : score >= 3 ? 'B' : 'C' };
  }

  function showStatus(message, isError) {
    const status = form.querySelector('[data-form-status]');
    if (!status) return;
    status.hidden = false;
    status.classList.toggle('is-error', Boolean(isError));
    status.innerHTML = message;
    status.focus?.({ preventScroll: true });
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const submit = form.querySelector('[data-submit]');
    const data = new FormData(form);
    const lead = scoreLead(data);
    form.querySelector('[data-lead-score]').value = String(lead.score);
    form.querySelector('[data-lead-tier]').value = lead.tier;
    form.querySelector('[data-submitted-at]').value = new Date().toISOString();
    const payload = new URLSearchParams(new FormData(form)).toString();

    submit.disabled = true;
    submit.textContent = 'Enviando…';
    try {
      if (isPublicHost()) {
        const response = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: payload
        });
        if (!response.ok) throw new Error('No se pudo registrar la solicitud');
      }

      track('b2b_form_submit', 'b2b-form', {
        business_type: data.get('business_type'),
        consumption_range: data.get('monthly_consumption'),
        lead_tier: lead.tier,
        lead_id: leadId?.value || ''
      });
      form.reset();
      syncEmailRequirement();
      showStatus(
        isPublicHost()
          ? 'Listo. Recibimos tu solicitud. También puedes <a href="https://wa.me/message/WQWEEODGY6H2P1" target="_blank" rel="noopener noreferrer">abrir WhatsApp</a>.'
          : 'Vista previa lista. Al publicar, esta solicitud se guardará en Netlify. También puedes <a href="https://wa.me/message/WQWEEODGY6H2P1" target="_blank" rel="noopener noreferrer">abrir WhatsApp</a>.',
        false
      );
      setLeadContext();
    } catch (error) {
      showStatus('No pudimos enviar todavía. Escríbenos por <a href="https://wa.me/message/WQWEEODGY6H2P1" target="_blank" rel="noopener noreferrer">WhatsApp</a> o intenta de nuevo.', true);
    } finally {
      submit.disabled = false;
      submit.textContent = 'Enviar solicitud';
    }
  });
})();
