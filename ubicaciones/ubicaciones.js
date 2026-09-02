(function () {
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

  document.querySelectorAll('[data-event]').forEach(function (element) {
    element.addEventListener('click', function () {
      track(element.dataset.event, element.dataset.cta, element.href || window.location.href);
    });
  });

  track('locations_hub_view', 'locations-page');
})();
