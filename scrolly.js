// Scroll behavior: reveal chapters as they enter, and a thin reading-progress bar.
(() => {
  'use strict';

  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach((e) => e.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    els.forEach((e) => io.observe(e));
  }

  const bar = document.getElementById('progress');
  if (!bar) return;
  let queued = false;
  const update = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.setProperty('--p', String(max > 0 ? Math.min(1, window.scrollY / max) : 0));
  };
  window.addEventListener('scroll', () => {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();
