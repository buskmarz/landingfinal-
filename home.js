(function () {
  const header = document.querySelector('[data-header]');
  const nav = document.querySelector('[data-nav]');
  const navToggle = document.querySelector('[data-nav-toggle]');
  const dialog = document.querySelector('[data-branch-dialog]');
  const branchOpeners = document.querySelectorAll('[data-branch-open]');
  const menuOpeners = document.querySelectorAll('[data-menu-open]');

  function track(eventName, cta, href) {
    const host = window.location.hostname.toLowerCase();
    const isPublicHost = host === 'bmoodcoffee.com' || host === 'www.bmoodcoffee.com' || /\.netlify\.(app|com)$/.test(host);
    if (!isPublicHost) return;
    const payload = JSON.stringify({
      event: eventName,
      cta: cta || 'unknown',
      path: window.location.pathname,
      href: href || window.location.href
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

  function openDialog(source, mode) {
    if (!dialog) return;
    dialog.dataset.mode = mode || 'branch';
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    document.body.classList.add('dialog-open');
    track(mode === 'menu' ? 'menu_selector_open' : 'branch_selector_open', source || 'unknown');
  }

  function closeDialog() {
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    document.body.classList.remove('dialog-open');
  }

  branchOpeners.forEach(function (opener) {
    opener.addEventListener('click', function () { openDialog(opener.dataset.cta, 'branch'); });
  });

  menuOpeners.forEach(function (opener) {
    opener.addEventListener('click', function () { openDialog(opener.dataset.cta, 'menu'); });
  });

  dialog?.querySelector('[data-dialog-close]')?.addEventListener('click', closeDialog);
  dialog?.addEventListener('click', function (event) {
    if (event.target === dialog) closeDialog();
  });
  dialog?.addEventListener('close', function () { document.body.classList.remove('dialog-open'); });

  navToggle?.addEventListener('click', function () {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    const nextExpanded = !expanded;
    navToggle.setAttribute('aria-expanded', String(nextExpanded));
    navToggle.setAttribute('aria-label', nextExpanded ? 'Cerrar menú' : 'Abrir menú');
    nav?.classList.toggle('is-open', nextExpanded);
  });

  nav?.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      navToggle?.setAttribute('aria-expanded', 'false');
      navToggle?.setAttribute('aria-label', 'Abrir menú');
      nav.classList.remove('is-open');
    });
  });

  document.querySelectorAll('[data-event]').forEach(function (element) {
    element.addEventListener('click', function () {
      track(element.dataset.event, element.dataset.cta, element.href || window.location.href);
    });
  });

  function updateHeader() {
    header?.classList.toggle('is-scrolled', window.scrollY > 20);
  }
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
    reveals.forEach(function (item) { observer.observe(item); });
  } else {
    reveals.forEach(function (item) { item.classList.add('is-visible'); });
  }
})();
