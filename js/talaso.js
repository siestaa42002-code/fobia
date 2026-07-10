/* Talasofobia — descenso al abismo profundo */
(function () {
  const canvas = document.getElementById('canvas-talaso');
  const ctx = canvas.getContext('2d');
  const vis = watchVisible(canvas);
  const depthEl = document.getElementById('depth-value');

  let depth = 0;
  const MAX_DEPTH = 3000;
  let lastSonar = 0;

  const motes = [];
  for (let i = 0; i < 60; i++) {
    motes.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() * 1.5 });
  }

  // Bioluminiscencia: puntos con brillo tenue que aparecen en lo profundo
  const glows = [];
  for (let i = 0; i < 14; i++) {
    glows.push({
      x: Math.random(), y: Math.random(),
      hue: Math.random() < 0.6 ? 190 : 280,     // cian o violeta
      phase: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 0.0002
    });
  }

  const creatures = [];
  function spawnCreature() {
    const dir = Math.random() < 0.5 ? 1 : -1;
    creatures.push({
      x: dir === 1 ? -0.4 : 1.4,
      y: 0.2 + Math.random() * 0.6,
      dir,
      speed: 0.0006 + Math.random() * 0.0012,
      size: 0.25 + Math.random() * 0.6,
      wave: Math.random() * Math.PI * 2,
      eyes: Math.random() < 0.5                 // algunas tienen ojos que brillan
    });
  }

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    depth = Math.max(0, Math.min(MAX_DEPTH, depth + e.deltaY * 0.45));
  }, { passive: false });

  let touchY = null;
  canvas.addEventListener('touchstart', e => touchY = e.touches[0].clientY);
  canvas.addEventListener('touchmove', e => {
    if (touchY === null) return;
    depth = Math.max(0, Math.min(MAX_DEPTH, depth + (touchY - e.touches[0].clientY) * 1.8));
    touchY = e.touches[0].clientY;
    e.preventDefault();
  }, { passive: false });

  function drawCreature(c, w, h, darkness) {
    const x = c.x * w, y = (c.y + Math.sin(c.wave) * 0.03) * h;
    const len = c.size * w;
    const alpha = 0.06 + darkness * 0.16;

    ctx.fillStyle = `rgba(2, 4, 6, ${alpha + 0.5})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i <= 20; i++) {
      const p = i / 20;
      const bodyW = Math.sin(p * Math.PI) * len * 0.09;
      const wob = Math.sin(c.wave * 3 + p * 5) * len * 0.02;
      ctx.lineTo(x + p * len * c.dir, y - bodyW + wob);
    }
    for (let i = 20; i >= 0; i--) {
      const p = i / 20;
      const bodyW = Math.sin(p * Math.PI) * len * 0.09;
      const wob = Math.sin(c.wave * 3 + p * 5) * len * 0.02;
      ctx.lineTo(x + p * len * c.dir, y + bodyW + wob);
    }
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + len * c.dir, y);
    ctx.lineTo(x + len * c.dir * 1.12, y - len * 0.07);
    ctx.lineTo(x + len * c.dir * 1.12, y + len * 0.07);
    ctx.closePath();
    ctx.fill();

    // Ojo brillante en lo muy profundo
    if (c.eyes && darkness > 0.5) {
      const ex = x + len * 0.12 * c.dir;
      ctx.fillStyle = `rgba(180, 240, 220, ${(darkness - 0.5) * 1.2})`;
      ctx.beginPath();
      ctx.arc(ex, y - len * 0.015, Math.max(1.5, len * 0.008), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop(t) {
    if (!vis.visible) { requestAnimationFrame(loop); return; }

    const { w, h, dpr } = fitCanvas(canvas);
    const d = depth / MAX_DEPTH;

    const r = Math.round(4 * (1 - d));
    const g = Math.round(30 * (1 - d));
    const b = Math.round(58 * (1 - d) + 4);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, w, h);

    // Rayos de superficie: mueren antes (a 20% de la nueva profundidad)
    if (d < 0.2) {
      const rayAlpha = (0.2 - d) * 0.4;
      for (let i = 0; i < 5; i++) {
        const rx = ((i / 5) + Math.sin(t * 0.0003 + i) * 0.03) * w;
        const grad = ctx.createLinearGradient(rx, 0, rx + w * 0.06, h);
        grad.addColorStop(0, `rgba(120, 180, 210, ${rayAlpha})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(rx, 0);
        ctx.lineTo(rx + w * 0.1, 0);
        ctx.lineTo(rx + w * 0.28, h);
        ctx.lineTo(rx + w * 0.1, h);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.fillStyle = `rgba(180, 200, 210, ${0.15 + d * 0.1})`;
    for (const m of motes) {
      m.y -= 0.0006 + d * 0.0012;
      if (m.y < 0) { m.y = 1; m.x = Math.random(); }
      ctx.beginPath();
      ctx.arc(m.x * w, m.y * h, m.s * dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bioluminiscencia: emerge desde el 40% de profundidad
    if (d > 0.4) {
      const bio = (d - 0.4) / 0.6;
      for (const gl of glows) {
        gl.x += gl.drift;
        if (gl.x < 0) gl.x = 1; if (gl.x > 1) gl.x = 0;
        const pulse = (Math.sin(t * 0.0012 + gl.phase) + 1) / 2;
        const a = bio * pulse * 0.55;
        if (a < 0.02) continue;
        const gx = gl.x * w, gy = gl.y * h;
        const rad = (3 + pulse * 5) * dpr;
        const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad * 4);
        gr.addColorStop(0, `hsla(${gl.hue}, 90%, 70%, ${a})`);
        gr.addColorStop(1, 'transparent');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(gx, gy, rad * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `hsla(${gl.hue}, 95%, 80%, ${a * 1.4})`;
        ctx.beginPath();
        ctx.arc(gx, gy, rad * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (d > 0.25 && Math.random() < 0.0035 && creatures.length < 4) spawnCreature();
    for (let i = creatures.length - 1; i >= 0; i--) {
      const c = creatures[i];
      c.x += c.speed * c.dir * (1 + d);
      c.wave += 0.03;
      drawCreature(c, w, h, d);
      if (c.x < -0.6 || c.x > 1.6) creatures.splice(i, 1);
    }

    depthEl.textContent = Math.round(depth);
    if (window.terror) {
      terror.setTension(d);
      if (t - lastSonar > 4000 - d * 2200 && d > 0.1) {
        terror.sonar(d);
        lastSonar = t;
      }
      if (d > 0.75 && Math.random() < 0.002) terror.scrape();
    }
    window.setCursorTense && setCursorTense(d > 0.7);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();