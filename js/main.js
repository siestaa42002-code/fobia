/* ============================================
   main.js — gate, scroll, cursor, glitches, acertijo
   ============================================ */

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

window.watchVisible = function (el) {
  const state = { visible: false };
  new IntersectionObserver(entries => {
    entries.forEach(e => state.visible = e.isIntersecting);
  }, { threshold: 0.05 }).observe(el);
  return state;
};

/* ---------- Cursor (con modo lento) ---------- */
(function () {
  const cursor = document.getElementById('cursor');
  let cx = -100, cy = -100, tx = -100, ty = -100;
  let slow = false;

  window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });

  function loop() {
    const ease = slow ? 0.05 : 0.35;   // en modo lento, el cursor "pesa"
    cx += (tx - cx) * ease;
    cy += (ty - cy) * ease;
    cursor.style.left = cx + 'px';
    cursor.style.top = cy + 'px';
    requestAnimationFrame(loop);
  }
  loop();

  window.setCursorTense = on => cursor.classList.toggle('tense', on);
  window.setCursorSlow = on => slow = on;
})();

/* ---------- Glitch global ---------- */
(function () {
  const layer = document.getElementById('glitch-layer');
  let enabled = false;

  // Flash a demanda (lo usa escopofobia)
  window.glitchFlash = function () {
    layer.classList.remove('flash');
    void layer.offsetWidth;
    layer.classList.add('flash');
    setTimeout(() => layer.classList.remove('flash'), 250);
  };

  function schedule() {
    const wait = 25000 + Math.random() * 45000;
    setTimeout(() => {
      if (enabled && document.visibilityState === 'visible') {
        window.glitchFlash();
        if (window.terror) terror.glitch();
      }
      schedule();
    }, wait);
  }

  window.enableGlitches = () => { enabled = true; };
  schedule();
})();

/* ---------- Acertijo ---------- */
window.riddle = (function () {
  const WORD = 'SALIDA';
  const found = new Array(WORD.length).fill(false);
  const hud = document.getElementById('riddle-hud');

  // Construye el HUD: _ _ _ _ _ _
  WORD.split('').forEach(() => {
    const s = document.createElement('span');
    s.textContent = '_';
    hud.appendChild(s);
  });
  const slots = hud.querySelectorAll('span');

  return {
    show() { hud.classList.remove('hidden'); },

    grant(index) {
      if (found[index]) return;
      found[index] = true;
      slots[index].textContent = WORD[index];
      slots[index].classList.add('found');
      if (window.terror) { terror.whisper(); terror.hit(); }
      if (window.glitchFlash) glitchFlash();
    },

    check(value) {
      return value.trim().toUpperCase() === WORD;
    }
  };
})();

/* ---------- Gate ---------- */
(function () {
  const gate = document.getElementById('gate');
  const btn = document.getElementById('enter-btn');
  const experience = document.getElementById('experience');
  const soundPanel = document.getElementById('sound-panel');

  btn.addEventListener('click', async () => {
    if (window.terror) await terror.init();
    experience.classList.remove('hidden');
    soundPanel.classList.remove('hidden');
    riddle.show();
    gate.classList.add('opened');
    window.enableGlitches();
    initScroll();
    if (window.terror) terror.setLevel(0);
  });
})();

/* ---------- Lenis + GSAP + salida ---------- */
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
      { opacity: 1, x: 0, duration: 1.2, ease: 'power2.out',
        scrollTrigger: { trigger: section, start: 'top 70%' } }
    );
    gsap.fromTo(stage,
      { opacity: 0, scale: 0.97 },
      { opacity: 1, scale: 1, duration: 1.6, ease: 'power2.out',
        scrollTrigger: { trigger: section, start: 'top 60%' } }
    );
  });

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

  const exit = document.getElementById('exit');
  new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        document.body.dataset.fear = '0';
        if (window.terror) terror.setLevel(0);
      }
    });
  }, { threshold: 0.5 }).observe(exit);

  // Comprobación de la palabra
  const codeInput = document.getElementById('exit-code');
  const tryBtn = document.getElementById('exit-try');
  const result = document.getElementById('exit-result');
  const freed = document.getElementById('freed');

  function attempt() {
    if (riddle.check(codeInput.value)) {
      freed.classList.add('show');
      if (window.terror) {
        terror.setLevel(0);
        terror.setBus('general', 0.1);
      }
    } else {
      result.textContent = 'No. Sigue buscando.';
      if (window.terror) terror.hit();
      if (window.glitchFlash) glitchFlash();
      codeInput.value = '';
      setTimeout(() => result.textContent = '', 2500);
    }
  }
  tryBtn.addEventListener('click', attempt);
  codeInput.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
}