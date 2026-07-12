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
    const ease = slow ? 0.05 : 0.35;
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

/* ---------- Acertijo (palabra ofuscada + validación por hash) ---------- */
window.riddle = (function () {
  // La palabra NO existe en texto plano: bytes XOR con clave 42
  const ENC = [121, 107, 102, 99, 110, 107];
  const K = 42;
  const dec = i => String.fromCharCode(ENC[i] ^ K);

  const found = new Array(ENC.length).fill(false);
  const hud = document.getElementById('riddle-hud');

  ENC.forEach(() => {
    const s = document.createElement('span');
    s.textContent = '_';
    hud.appendChild(s);
  });
  const slots = hud.querySelectorAll('span');

  // Hash SHA-256 en hexadecimal
  async function sha(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Hash objetivo: se calcula una sola vez a partir de la palabra decodificada
  let targetHash = null;
  async function ensureHash() {
    if (targetHash) return;
    let word = '';
    for (let i = 0; i < ENC.length; i++) word += dec(i);
    targetHash = await sha(word);
  }

  return {
    show() { hud.classList.remove('hidden'); },

    grant(index) {
      if (found[index]) return;
      found[index] = true;
      slots[index].textContent = dec(index);
      slots[index].classList.add('found');
      if (window.terror) { terror.whisper(); terror.hit(); }
      if (window.glitchFlash) glitchFlash();
    },

    async check(value) {
      await ensureHash();
      const attempt = value.trim().toUpperCase();
      if (attempt.length !== ENC.length) return false;
      return (await sha(attempt)) === targetHash;
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

  // Comprobación de la palabra (asíncrona por el hash)
  const codeInput = document.getElementById('exit-code');
  const tryBtn = document.getElementById('exit-try');
  const result = document.getElementById('exit-result');
  const freed = document.getElementById('freed');
  let checking = false;

  async function attempt() {
    if (checking) return;
    checking = true;
    const ok = await riddle.check(codeInput.value);
    checking = false;

    if (ok) {
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