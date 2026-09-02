(function () {
  const header = document.querySelector('[data-header]');
  const nav = document.querySelector('[data-nav]');
  const toggle = document.querySelector('[data-nav-toggle]');
  const form = document.querySelector('[data-careers-form]');
  const params = new URLSearchParams(window.location.search);

  function publicHost() {
    const host = window.location.hostname.toLowerCase();
    return host === 'bmoodcoffee.com' || host === 'www.bmoodcoffee.com' || /\.netlify\.(app|com)$/.test(host);
  }

  function track(eventName, meta) {
    if (!publicHost()) return;
    const body = JSON.stringify({
      event: eventName,
      cta: 'careers',
      path: window.location.pathname,
      meta: Object.assign({
        utm_source: params.get('utm_source') || '',
        utm_medium: params.get('utm_medium') || '',
        utm_campaign: params.get('utm_campaign') || ''
      }, meta || {})
    });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/track-event', new Blob([body], { type: 'application/json' }));
    else fetch('/api/track-event', { method: 'POST', headers: { 'content-type': 'application/json' }, body: body, keepalive: true }).catch(function () {});
  }

  function closeNav() {
    nav?.classList.remove('is-open');
    document.body.classList.remove('nav-open');
    toggle?.setAttribute('aria-expanded', 'false');
  }

  toggle?.addEventListener('click', function () {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    nav?.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
  });
  nav?.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', closeNav); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && nav?.classList.contains('is-open')) { closeNav(); toggle?.focus(); } });
  function updateHeader() { header?.classList.toggle('is-scrolled', window.scrollY > 18); }
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
    }, { threshold: .08, rootMargin: '0px 0px -30px' });
    reveals.forEach(function (element) { observer.observe(element); });
  } else reveals.forEach(function (element) { element.classList.add('is-visible'); });

  document.querySelectorAll('[data-track]').forEach(function (element) { element.addEventListener('click', function () { track(element.dataset.track); }); });
  track(document.body.hasAttribute('data-careers-success') ? 'careers_form_success' : 'careers_page_view');

  if (!form) return;
  form.querySelectorAll('[data-utm]').forEach(function (field) { field.value = params.get(field.dataset.utm) || ''; });
  let started = false;
  form.addEventListener('input', function () { if (!started) { started = true; track('careers_form_start'); } });
  form.addEventListener('submit', function (event) {
    const file = form.querySelector('[data-cv]')?.files?.[0];
    const status = form.querySelector('[data-form-status]');
    const allowedExtensions = /\.(pdf|doc|docx)$/i;
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (file && file.size > 8 * 1024 * 1024) {
      event.preventDefault();
      if (status) { status.hidden = false; status.textContent = 'Tu archivo supera 8 MB. Reduce su tamaño e intenta de nuevo.'; }
      form.querySelector('[data-cv]')?.focus();
      return;
    }
    if (file && (!allowedExtensions.test(file.name) || (file.type && !allowedTypes.includes(file.type)))) {
      event.preventDefault();
      if (status) { status.hidden = false; status.textContent = 'Adjunta tu CV en formato PDF, DOC o DOCX.'; }
      form.querySelector('[data-cv]')?.focus();
      return;
    }
    if (!form.reportValidity()) { event.preventDefault(); return; }
    const submit = form.querySelector('[data-submit]');
    if (submit) { submit.disabled = true; submit.textContent = 'Enviando…'; }
    track('careers_form_submit', {
      role_type: String(new FormData(form).get('puesto') || ''),
      branch: String(new FormData(form).get('sucursal') || '')
    });
  });
})();
