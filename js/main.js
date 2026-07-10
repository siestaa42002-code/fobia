/* ============================================
   main.js — gate, Lenis, GSAP, cursor, glitches
   ============================================ */

// Helper global de canvas
window.fitCanvas = function (canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.floor(rect.width * dpr);
  const h = Math.floor(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { w, h, dpr };
};

// .visible indica si el elemento está en pantalla; los bucles se pausan si es false
window.watchVisible = function (el) {
  const state = { visible: false };
  new IntersectionObserver(entries => {
    entries.forEach(e => state.visible = e.isIntersecting);
  }, { threshold: 0.05 }).observe(el);
  return state;
};

/* ---------- Cursor personalizado ---------- */
(function () {
  const cursor = document.getElementById('cursor');
  let cx = -100, cy = -100, tx = -100, ty = -100;

  window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });

  function loop() {
    cx += (tx - cx) * 0.35;
    cy += (ty - cy) * 0.35;
    cursor.style.left = cx + 'px';
    cursor.style.top = cy + 'px';
    requestAnimationFrame(loop);
  }
  loop();

  window.setCursorTense = on => cursor.classList.toggle('tense', on);
})();

/* ---------- Glitch global aleatorio ---------- */
(function () {
  const layer = document.getElementById('glitch-layer');
  let enabled = false;

  function schedule() {
    const wait = 25000 + Math.random() * 45000;
    setTimeout(() => {
      if (enabled && document.visibilityState === 'visible') {
        layer.classList.add('flash');
        if (window.terror) terror.glitch();
        setTimeout(() => layer.classList.remove('flash'), 250);
      }
      schedule();
    }, wait);
  }

  window.enableGlitches = () => { enabled = true; };
  schedule();
})();

/* ---------- Gate: entrada y desbloqueo ---------- */
(function () {
  const gate = document.getElementById('gate');
  const btn = document.getElementById('enter-btn');
  const experience = document.getElementById('experience');
  const soundPanel = document.getElementById('sound-panel');

  btn.addEventListener('click', async () => {
    if (window.terror) await terror.init();

    experience.classList.remove('hidden');
    soundPanel.classList.remove('hidden');
    gate.classList.add('opened');
    window.enableGlitches();

    initScroll();

    if (window.terror) terror.setLevel(0);
  });
})();

/* ---------- Lenis + GSAP (se inicia al entrar) ---------- */
function initScroll() {
  const lenis = new Lenis({ duration: 1.6, smoothWheel: true });

  gsap.registerPlugin(ScrollTrigger);
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  gsap.fromTo('.intro-line',
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 1.6, stagger: 1.1, ease: 'power2.out', delay: 0.8 }
  );

  document.querySelectorAll('.fear-section').forEach(section => {
    const header = section.querySelector('.fear-header');
    const stage = section.querySelector('.fear-stage');

    gsap.fromTo(header,
      { opacity: 0, x: -40 },
      {
        opacity: 1, x: 0, duration: 1.2, ease: 'power2.out',
        scrollTrigger: { trigger: section, start: 'top 70%' }
      }
    );

    gsap.fromTo(stage,
      { opacity: 0, scale: 0.97 },
      {
        opacity: 1, scale: 1, duration: 1.6, ease: 'power2.out',
        scrollTrigger: { trigger: section, start: 'top 60%' }
      }
    );
  });

  // Nivel de miedo global por sección
  const sections = document.querySelectorAll('.fear-section');
  const activate = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const id = e.target.dataset.fearId;
      document.body.dataset.fear = id;
      if (window.terror) terror.setLevel(parseInt(id, 10));
    });
  }, { threshold: 0.4 });
  sections.forEach(s => activate.observe(s));

  // Al llegar a la salida, el miedo baja
  const exit = document.getElementById('exit');
  new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        document.body.dataset.fear = '0';
        if (window.terror) terror.setLevel(0);
      }
    });
  }, { threshold: 0.5 }).observe(exit);
}