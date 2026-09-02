(function () {
  function addDockLink(menu, config) {
    const link = document.createElement('a');
    link.className = 'delivery-dock__item delivery-dock__item--' + config.brand;
    link.href = config.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.dataset.event = config.event;
    link.dataset.cta = 'home-dock-' + config.brand;
    if (config.label) {
      if (config.brand === 'uber') {
        link.appendChild(document.createTextNode('Uber'));
        const suffix = document.createElement('span');
        suffix.className = 'delivery-dock__suffix';
        suffix.textContent = ' Eats';
        link.appendChild(suffix);
      } else {
        link.textContent = config.label;
      }
    } else {
      link.setAttribute('aria-label', 'Escríbenos por WhatsApp');
      const icon = document.createElement('img');
      icon.src = '/assets/whatsapp.svg';
      icon.alt = '';
      icon.width = 30;
      icon.height = 30;
      link.appendChild(icon);
    }
    menu.appendChild(link);
  }

  const deliveryDockBlocked = [
    /^\/sistema(?:\/|$)/,
    /^\/game(?:\/|$)/,
    /^\/ruleta(?:\/|$)/,
    /^\/arcade(?:\/|$)/,
    /^\/eventos(?:\/|$)/,
    /^\/talleres-de-cafe-puebla(?:\/|$)/,
    /^\/cafe-para-negocios-puebla(?:\/|$)/,
    /^\/trabaja-con-nosotros(?:\/|$)/,
    /^\/recompensas(?:\/|$)/,
    /^\/cafe-lavado(?:\/|$)/
  ].some(function (pattern) { return pattern.test(window.location.pathname); });

  if (!deliveryDockBlocked && !document.querySelector('.delivery-dock')) {
    const dock = document.createElement('details');
    dock.className = 'delivery-dock';
    const toggle = document.createElement('summary');
    toggle.className = 'delivery-dock__toggle';
    toggle.textContent = 'Pedir';
    toggle.setAttribute('aria-label', 'Abrir opciones para pedir o contactar');
    const menu = document.createElement('nav');
    menu.className = 'delivery-dock__menu';
    menu.setAttribute('aria-label', 'Pedidos y contacto');
    addDockLink(menu, {
      brand: 'uber',
      label: 'Uber Eats',
      href: 'https://www.ubereats.com/store/better-mood-coffee/hPA2fzGUX9WLGGvkeNwCrg?diningMode=DELIVERY',
      event: 'click_ubereats'
    });
    addDockLink(menu, {
      brand: 'rappi',
      label: 'Rappi',
      href: 'https://www.rappi.com.mx/restaurantes/delivery/495986-better-mood-coffee?utm_source=app&utm_medium=deeplink&utm_campaign=share',
      event: 'click_rappi'
    });
    addDockLink(menu, {
      brand: 'whatsapp',
      href: 'https://wa.me/message/WQWEEODGY6H2P1',
      event: 'click_whatsapp'
    });
    dock.append(toggle, menu);
    document.body.appendChild(dock);
    document.addEventListener('click', function (event) {
      if (dock.open && !dock.contains(event.target)) dock.open = false;
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') dock.open = false;
    });
  }

  const header = document.querySelector('[data-header]');
  const nav = document.querySelector('[data-nav]');
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navPopovers = Array.from(document.querySelectorAll('[data-nav-popover]'));
  const dialog = document.querySelector('[data-branch-dialog]');
  const branchOpeners = document.querySelectorAll('[data-branch-open]');
  const menuOpeners = document.querySelectorAll('[data-menu-open]');

  function closeNavPopovers(except) {
    navPopovers.forEach(function (popover) {
      if (popover !== except) popover.removeAttribute('open');
    });
  }

  navPopovers.forEach(function (popover) {
    popover.addEventListener('toggle', function () {
      if (popover.hasAttribute('open')) closeNavPopovers(popover);
    });
  });

  function track(eventName, cta, href) {
    const host = window.location.hostname.toLowerCase();
    const isPublicHost = host === 'bmoodcoffee.com' || host === 'www.bmoodcoffee.com' || /\.netlify\.(app|com)$/.test(host);
    if (!isPublicHost) return;
    let sessionId = '';
    try {
      sessionId = window.sessionStorage.getItem('bm_session_id') || '';
      if (!sessionId) {
        sessionId = `BM-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        window.sessionStorage.setItem('bm_session_id', sessionId);
      }
    } catch (error) {}
    const params = new URLSearchParams(window.location.search);
    let referrerHost = '';
    try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ''; } catch (error) {}
    const payload = JSON.stringify({
      event: eventName,
      cta: cta || 'unknown',
      path: window.location.pathname,
      href: href || window.location.href,
      meta: {
        session_id: sessionId,
        referrer_host: referrerHost,
        utm_source: params.get('utm_source') || '',
        utm_medium: params.get('utm_medium') || '',
        utm_campaign: params.get('utm_campaign') || ''
      }
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
    nav?.classList.remove('is-open');
    closeNavPopovers();
    navToggle?.setAttribute('aria-expanded', 'false');
    navToggle?.setAttribute('aria-label', 'Abrir menú');
    document.body.classList.remove('nav-open');
    const resolvedMode = mode || 'branch';
    const title = dialog.querySelector('[data-dialog-title]');
    const kicker = dialog.querySelector('[data-dialog-kicker]');
    dialog.dataset.mode = resolvedMode;
    if (title) title.textContent = resolvedMode === 'menu' ? 'Elige el menú de tu sucursal.' : '¿A cuál sucursal vienes?';
    if (kicker) kicker.textContent = resolvedMode === 'menu' ? 'Menús Better Mood' : 'Better Mood Coffee';
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    document.body.classList.add('dialog-open');
    track(resolvedMode === 'menu' ? 'menu_selector_open' : 'branch_selector_open', source || 'unknown');
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
    document.body.classList.toggle('nav-open', nextExpanded);
  });

  nav?.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      navToggle?.setAttribute('aria-expanded', 'false');
      navToggle?.setAttribute('aria-label', 'Abrir menú');
      nav.classList.remove('is-open');
      closeNavPopovers();
      document.body.classList.remove('nav-open');
    });
  });

  document.addEventListener('click', function (event) {
    navPopovers.forEach(function (popover) {
      if (popover.hasAttribute('open') && !popover.contains(event.target)) popover.removeAttribute('open');
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    const openPopover = navPopovers.find(function (popover) { return popover.hasAttribute('open'); });
    if (openPopover) {
      openPopover.removeAttribute('open');
      openPopover.querySelector('summary')?.focus();
      return;
    }
    if (nav?.classList.contains('is-open')) {
      nav.classList.remove('is-open');
      document.body.classList.remove('nav-open');
      navToggle?.setAttribute('aria-expanded', 'false');
      navToggle?.setAttribute('aria-label', 'Abrir menú');
      navToggle?.focus();
    }
  });

  document.querySelectorAll('[data-event]').forEach(function (element) {
    element.addEventListener('click', function () {
      track(element.dataset.event, element.dataset.cta, element.href || window.location.href);
    });
  });

  const pageViewEvent = document.body.dataset.pageViewEvent || (window.location.pathname === '/' ? 'home_page_view' : 'site_page_view');
  const pageViewCta = document.body.dataset.pageViewCta || (window.location.pathname === '/' ? 'home-page' : 'site-page');
  track(pageViewEvent, pageViewCta);

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

  const depthPhoto = document.querySelector('[data-depth-photo]');
  const depthAllowed = window.matchMedia('(min-width: 981px) and (prefers-reduced-motion: no-preference)');
  let depthFrame = 0;

  function updateDepthPhoto() {
    depthFrame = 0;
    if (!depthPhoto || !depthAllowed.matches) {
      depthPhoto?.style.removeProperty('--depth-y');
      return;
    }

    const rect = depthPhoto.parentElement.getBoundingClientRect();
    const viewportCenter = window.innerHeight / 2;
    const elementCenter = rect.top + rect.height / 2;
    const progress = Math.max(-1, Math.min(1, (viewportCenter - elementCenter) / window.innerHeight));
    depthPhoto.style.setProperty('--depth-y', `${(progress * 8).toFixed(2)}px`);
  }

  function requestDepthUpdate() {
    if (depthFrame) return;
    depthFrame = window.requestAnimationFrame(updateDepthPhoto);
  }

  if (depthPhoto) {
    updateDepthPhoto();
    window.addEventListener('scroll', requestDepthUpdate, { passive: true });
    window.addEventListener('resize', requestDepthUpdate, { passive: true });
    depthAllowed.addEventListener?.('change', requestDepthUpdate);
  }

})();
