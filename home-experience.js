(function () {
  const gallery = document.querySelector('[data-hero-rotation]');
  if (!gallery) return;
  const photos = Array.from(gallery.querySelectorAll('img'));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let visible = false;
  let timer;

  function show(index) {
    photos[current].classList.remove('is-current');
    photos[current].setAttribute('aria-hidden', 'true');
    current = index;
    photos[current].classList.add('is-current');
    photos[current].removeAttribute('aria-hidden');
  }
  function update() {
    clearInterval(timer);
    if (motion.matches) {
      show(photos.length - 1);
    } else if (visible && !document.hidden) {
      timer = setInterval(() => show((current + 1) % photos.length), 6000);
    }
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    update();
  }).observe(gallery);
  motion.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  update();
})();

// Advance the V60 in either direction without taking over normal scrolling.
(function () {
  const section = document.querySelector('[data-pour]');
  if (!section) return;

  const scene = section.querySelector('.home-pour__scene');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let imagesReady = false;
  let frame = 0;

  function render() {
    frame = 0;
    const bounds = scene.getBoundingClientRect();
    const viewport = window.innerHeight;
    const center = bounds.top + bounds.height / 2;
    const progress = Math.min(1, Math.max(0, (viewport * .86 - center) / (viewport * .48)));
    section.style.setProperty('--pour-progress', progress.toFixed(3));
    const stage = String(Math.min(2, Math.floor(progress * 3)));
    if (section.dataset.stage !== stage) section.dataset.stage = stage;
  }

  function schedule() {
    if (visible && imagesReady && !frame && !reducedMotion.matches) frame = requestAnimationFrame(render);
  }

  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !imagesReady && !reducedMotion.matches) {
      Promise.all(Array.from(scene.querySelectorAll('img'), image => image.decode())).then(() => {
        imagesReady = true;
        schedule();
      }).catch(() => {});
    }
    schedule();
  });
  visibility.observe(scene);

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      section.removeAttribute('data-stage');
      return;
    }
    visibility.unobserve(scene);
    visibility.observe(scene);
  });
})();
