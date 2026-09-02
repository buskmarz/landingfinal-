(function () {
  const index = document.querySelector('[data-menu-index]');
  if (!index) return;
  const track = index.querySelector('.menu-index__track');

  const links = Array.from(index.querySelectorAll('[data-menu-link]'));
  const sections = links
    .map(function (link) {
      return document.querySelector(link.getAttribute('href'));
    })
    .filter(Boolean);
  let manualLockUntil = 0;
  let scrollFrame = 0;

  function setActive(id) {
    let activeLink = null;
    links.forEach(function (link) {
      const active = link.getAttribute('href') === '#' + id;
      link.classList.toggle('is-active', active);
      if (active) {
        link.setAttribute('aria-current', 'location');
        activeLink = link;
      }
      else link.removeAttribute('aria-current');
    });
    if (activeLink && track && track.scrollWidth > track.clientWidth) {
      const targetLeft = activeLink.offsetLeft - ((track.clientWidth - activeLink.offsetWidth) / 2);
      track.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    }
  }

  links.forEach(function (link) {
    link.addEventListener('click', function (event) {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      manualLockUntil = Date.now() + 1200;
      setActive(id);
      window.history.pushState(null, '', '#' + id);
      const indexHeight = index.getBoundingClientRect().height || 0;
      const headerHeight = Number.parseFloat(getComputedStyle(document.body).getPropertyValue('--menu-header-height')) || 0;
      const targetTop = target.getBoundingClientRect().top + window.scrollY - headerHeight - indexHeight - 16;
      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    });
  });

  function updateFromScroll() {
    scrollFrame = 0;
    if (Date.now() < manualLockUntil || !sections.length) return;
    const indexHeight = index.getBoundingClientRect().height || 0;
    const headerHeight = Number.parseFloat(getComputedStyle(document.body).getPropertyValue('--menu-header-height')) || 0;
    const marker = headerHeight + indexHeight + 36;
    let current = sections[0];
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8) {
      setActive(sections[sections.length - 1].id);
      return;
    }
    sections.forEach(function (section) {
      if (section.getBoundingClientRect().top <= marker) current = section;
    });
    setActive(current.id);
  }

  window.addEventListener('scroll', function () {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(updateFromScroll);
  }, { passive: true });
  window.addEventListener('hashchange', function () {
    const target = window.location.hash && document.querySelector(window.location.hash);
    if (target) setActive(target.id);
  });

  const initial = window.location.hash && document.querySelector(window.location.hash);
  setActive(initial ? initial.id : sections[0]?.id);
  window.requestAnimationFrame(updateFromScroll);
})();
