/* Tripofobia — la superficie que respira y se frota consigo misma */
(function () {
  const canvas = document.getElementById('canvas-tripo');
  const ctx = canvas.getContext('2d');
  const vis = watchVisible(canvas);

  const holes = [];
  const MAX_HOLES = 220;

  function makeHole(x, y) {
    return {
      x, y, r: 0.001,
      born: performance.now(),
      phase: Math.random() * Math.PI * 2,
      px: 0, py: 0, curR: 0
    };
  }

  function seed() {
    for (let i = 0; i < 14; i++) holes.push(makeHole(Math.random(), Math.random()));
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
    if (window.terror) { terror.squish(); terror.setTension(Math.min(1, holes.length / MAX_HOLES)); }
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

  // FRICCIÓN CONTINUA: cuenta cuántos agujeros están en contacto y
  // ajusta el volumen del roce de carne. Choques nuevos disparan squish.
  let prevOverlaps = 0;
  setInterval(() => {
    if (!vis.visible || !window.terror) { if (window.terror) terror.setFriction(0); return; }

    let overlaps = 0;
    const sample = Math.min(holes.length, 90);
    for (let k = 0; k < sample; k++) {
      const a = holes[(k * 7) % holes.length];
      const b = holes[Math.floor(Math.random() * holes.length)];
      if (!a || !b || a === b) continue;
      const dd = Math.hypot(a.px - b.px, a.py - b.py);
      if (dd > 0 && dd < (a.curR + b.curR)) overlaps++;
    }

    // El roce respira: sube con los contactos, modulado por la "respiración" global
    terror.setFriction(Math.min(1, overlaps / 12));

    // Choques NUEVOS (subida brusca de contactos): golpe húmedo
    if (overlaps > prevOverlaps + 2) terror.squish();
    prevOverlaps = overlaps;
  }, 280);

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
      hole.px = hx; hole.py = hy; hole.curR = R * 1.3;

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

    if (holes.length >= MAX_HOLES) riddle.grant(3);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();