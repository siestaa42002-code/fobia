/* Tripofobia — la superficie que respira y se toca a sí misma */
(function () {
  const canvas = document.getElementById('canvas-tripo');
  const ctx = canvas.getContext('2d');
  const vis = watchVisible(canvas);

  const holes = [];
  const MAX_HOLES = 220;

  function makeHole(x, y) {
    return {
      x, y,
      r: 0.001,
      born: performance.now(),
      phase: Math.random() * Math.PI * 2,
      curR: 0            // radio actual en px (para colisiones)
    };
  }

  function seed() {
    for (let i = 0; i < 14; i++) {
      holes.push(makeHole(Math.random(), Math.random()));
    }
  }
  seed();

  canvas.addEventListener('pointerdown', e => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const n = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      if (holes.length >= MAX_HOLES) holes.shift();
      const a = Math.random() * Math.PI * 2;
      const d = 0.02 + Math.random() * 0.09;
      holes.push(makeHole(
        Math.max(0.02, Math.min(0.98, x + Math.cos(a) * d)),
        Math.max(0.02, Math.min(0.98, y + Math.sin(a) * d))
      ));
    }
    if (window.terror) { terror.pop(); terror.setTension(Math.min(1, holes.length / MAX_HOLES)); }
  });

  setInterval(() => {
    if (!vis.visible) return;
    if (holes.length === 0 || holes.length >= MAX_HOLES) return;
    const parent = holes[Math.floor(Math.random() * holes.length)];
    const a = Math.random() * Math.PI * 2;
    const d = 0.03 + Math.random() * 0.05;
    holes.push(makeHole(
      Math.max(0.02, Math.min(0.98, parent.x + Math.cos(a) * d)),
      Math.max(0.02, Math.min(0.98, parent.y + Math.sin(a) * d))
    ));
    if (window.terror && Math.random() < 0.4) terror.pop();
  }, 1400);

  // Detección de choques: cada 300 ms, no cada frame (rendimiento)
  setInterval(() => {
    if (!vis.visible || !window.terror) return;
    let collisions = 0;
    // Solo una muestra aleatoria de pares (con 220 agujeros el total sería 24k pares)
    for (let k = 0; k < 60; k++) {
      const a = holes[Math.floor(Math.random() * holes.length)];
      const b = holes[Math.floor(Math.random() * holes.length)];
      if (!a || !b || a === b) continue;
      const dx = a.px - b.px, dy = a.py - b.py;
      const dd = Math.hypot(dx, dy);
      if (dd > 0 && dd < (a.curR + b.curR)) collisions++;
    }
    // Cuantos más choques (superficies frotándose), más suena la carne
    if (collisions > 0) {
      terror.squish();
      if (collisions > 4) setTimeout(() => terror.squish(), 260);
    }
  }, 300);

  function loop(t) {
    if (!vis.visible) { requestAnimationFrame(loop); return; }

    const { w, h, dpr } = fitCanvas(canvas);

    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#2b241d');
    g.addColorStop(0.5, '#3a3026');
    g.addColorStop(1, '#241e18');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(60, 48, 38, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i / 8) * h + Math.sin(t * 0.0004 + i) * 12);
      for (let x = 0; x <= w; x += w / 12) {
        ctx.lineTo(x, (i / 8) * h + Math.sin(t * 0.0004 + i + x * 0.008 / dpr) * 12);
      }
      ctx.stroke();
    }

    const now = performance.now();

    for (const hole of holes) {
      const age = (now - hole.born) / 1000;
      const grow = Math.min(1, age / 2.2);
      const breath = 1 + Math.sin(t * 0.002 + hole.phase) * 0.14;
      const R = Math.max(0.001, (0.008 + grow * 0.024)) * Math.min(w, h) * breath;

      const hx = hole.x * w, hy = hole.y * h;
      hole.px = hx; hole.py = hy; hole.curR = R * 1.3;   // guarda para colisiones

      const rim = ctx.createRadialGradient(hx, hy, R * 0.55, hx, hy, R * 1.6);
      rim.addColorStop(0, 'rgba(0, 0, 0, 0)');
      rim.addColorStop(0.45, 'rgba(72, 58, 44, 0.85)');
      rim.addColorStop(0.7, 'rgba(28, 22, 17, 0.9)');
      rim.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.arc(hx, hy, R * 1.6, 0, Math.PI * 2);
      ctx.fill();

      const pit = ctx.createRadialGradient(hx, hy, 0, hx, hy, R);
      pit.addColorStop(0, '#000000');
      pit.addColorStop(0.75, '#0a0705');
      pit.addColorStop(1, '#1a140e');
      ctx.fillStyle = pit;
      ctx.beginPath();
      ctx.arc(hx, hy, R, 0, Math.PI * 2);
      ctx.fill();
    }

    if (window.terror) terror.setTension(Math.min(1, holes.length / MAX_HOLES) * 0.85);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();