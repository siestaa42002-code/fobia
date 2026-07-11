/* Talasofobia — letra L: toca el fondo */
(function () {
  const canvas = document.getElementById('canvas-talaso');
  const ctx = canvas.getContext('2d');
  const vis = watchVisible(canvas);
  const depthEl = document.getElementById('depth-value');

  let depth = 0;
  let depthVel = 0;              // velocidad de descenso (para el paralaje)
  const MAX_DEPTH = 40000;       // 40 km
  let lastSonar = 0;
  let leviathanSpawned = false;

  const motes = [];
  for (let i = 0; i < 60; i++) {
    motes.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() * 1.5, z: 0.4 + Math.random() * 0.6 });
  }

  // Burbujas: siempre suben, más rápido si tú bajas
  const bubbles = [];
  for (let i = 0; i < 22; i++) {
    bubbles.push({ x: Math.random(), y: Math.random(), r: 1.5 + Math.random() * 3.5, z: 0.4 + Math.random() * 0.6 });
  }

  const glows = [];
  for (let i = 0; i < 14; i++) {
    glows.push({
      x: Math.random(), y: Math.random(),
      hue: Math.random() < 0.6 ? 190 : 280,
      phase: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 0.0002,
      z: 0.5 + Math.random() * 0.5
    });
  }

  const creatures = [];
  function spawn(d) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    let type = 'fish';
    if (d > 0.85 && !leviathanSpawned) { type = 'leviathan'; leviathanSpawned = true; }
    else if (d > 0.5 && Math.random() < 0.4) type = 'angler';
    else if (d > 0.25 && Math.random() < 0.35) type = 'jelly';

    creatures.push({
      type, dir,
      x: type === 'jelly' ? Math.random() : (dir === 1 ? -0.5 : 1.5),
      y: type === 'jelly' ? 1.1 : 0.2 + Math.random() * 0.6,
      speed: type === 'leviathan' ? 0.0004 : 0.0006 + Math.random() * 0.0012,
      size: type === 'leviathan' ? 1.3 : 0.2 + Math.random() * 0.45,
      wave: Math.random() * Math.PI * 2,
      hue: Math.random() < 0.5 ? 190 : 300,
      z: type === 'leviathan' ? 1 : 0.5 + Math.random() * 0.5
    });
    if (type === 'leviathan' && window.terror) { terror.hit(); terror.whisper(); }
  }

  // Descenso más lento (antes deltaY*3, ahora *1.1)
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    depth = Math.max(0, Math.min(MAX_DEPTH, depth + e.deltaY * 1.1));
  }, { passive: false });

  let touchY = null;
  canvas.addEventListener('touchstart', e => touchY = e.touches[0].clientY);
  canvas.addEventListener('touchmove', e => {
    if (touchY === null) return;
    depth = Math.max(0, Math.min(MAX_DEPTH, depth + (touchY - e.touches[0].clientY) * 5));
    touchY = e.touches[0].clientY;
    e.preventDefault();
  }, { passive: false });

  let prevDepth = 0;

  function fishBody(x, y, len, dir, wave, alpha) {
    ctx.fillStyle = `rgba(2, 4, 6, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i <= 20; i++) {
      const p = i / 20;
      const bw = Math.sin(p * Math.PI) * len * 0.09;
      const wob = Math.sin(wave * 3 + p * 5) * len * 0.02;
      ctx.lineTo(x + p * len * dir, y - bw + wob);
    }
    for (let i = 20; i >= 0; i--) {
      const p = i / 20;
      const bw = Math.sin(p * Math.PI) * len * 0.09;
      const wob = Math.sin(wave * 3 + p * 5) * len * 0.02;
      ctx.lineTo(x + p * len * dir, y + bw + wob);
    }
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + len * dir, y);
    ctx.lineTo(x + len * dir * 1.12, y - len * 0.07);
    ctx.lineTo(x + len * dir * 1.12, y + len * 0.07);
    ctx.closePath();
    ctx.fill();
  }

  function drawCreature(c, w, h, d, t, dpr) {
    const y = (c.y + Math.sin(c.wave) * 0.03) * h;
    const x = c.x * w;
    const len = c.size * w;

    if (c.type === 'jelly') {
      const R = len * 0.2;
      const pulse = 1 + Math.sin(c.wave * 2) * 0.12;
      const g = ctx.createRadialGradient(x, y, 0, x, y, R * pulse);
      g.addColorStop(0, `hsla(${c.hue}, 80%, 70%, ${0.12 + d * 0.15})`);
      g.addColorStop(0.7, `hsla(${c.hue}, 80%, 60%, ${0.05 + d * 0.08})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, R * pulse, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `hsla(${c.hue}, 75%, 65%, ${0.1 + d * 0.12})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const tx = x - R * 0.7 + (i / 5) * R * 1.4;
        ctx.beginPath();
        ctx.moveTo(tx, y);
        for (let s2 = 1; s2 <= 5; s2++) {
          ctx.lineTo(tx + Math.sin(c.wave * 2 + i + s2) * R * 0.15, y + s2 * R * 0.45);
        }
        ctx.stroke();
      }
    } else if (c.type === 'angler') {
      fishBody(x, y, len, c.dir, c.wave, 0.65 + d * 0.25);
      const lx = x + len * 0.1 * c.dir;
      const bob = Math.sin(t * 0.003 + c.wave) * len * 0.02;
      ctx.strokeStyle = `rgba(140, 200, 190, ${0.3 + d * 0.3})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx, y - len * 0.06);
      ctx.quadraticCurveTo(lx + len * 0.1 * c.dir, y - len * 0.2, lx + len * 0.16 * c.dir, y - len * 0.1 + bob);
      ctx.stroke();
      const g = ctx.createRadialGradient(lx + len * 0.16 * c.dir, y - len * 0.1 + bob, 0, lx + len * 0.16 * c.dir, y - len * 0.1 + bob, 8 * dpr);
      g.addColorStop(0, `rgba(190, 255, 240, ${0.7 + d * 0.2})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(lx + len * 0.16 * c.dir, y - len * 0.1 + bob, 8 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(216, 211, 200, ${0.2 + d * 0.2})`;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const tx2 = x + len * (0.02 + i * 0.02) * c.dir;
        ctx.moveTo(tx2, y + len * 0.03);
        ctx.lineTo(tx2 + len * 0.008 * c.dir, y + len * 0.06);
      }
      ctx.stroke();
    } else if (c.type === 'leviathan') {
      fishBody(x, y, len, c.dir, c.wave * 0.4, 0.85);
      const ex = x + len * 0.12 * c.dir;
      const g = ctx.createRadialGradient(ex, y - len * 0.01, 0, ex, y - len * 0.01, 14 * dpr);
      g.addColorStop(0, 'rgba(220, 240, 230, 0.9)');
      g.addColorStop(0.4, 'rgba(160, 200, 180, 0.4)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ex, y - len * 0.01, 14 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(5, 8, 8, 0.95)';
      ctx.beginPath();
      ctx.arc(ex, y - len * 0.01, 5 * dpr, 0, Math.PI * 2);
      ctx.fill();
    } else {
      fishBody(x, y, len, c.dir, c.wave, 0.5 + d * 0.3);
      if (d > 0.4) {
        ctx.fillStyle = `rgba(180, 240, 220, ${(d - 0.4) * 0.9})`;
        ctx.beginPath();
        ctx.arc(x + len * 0.12 * c.dir, y - len * 0.015, Math.max(1.5, len * 0.008), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function loop(t) {
    if (!vis.visible) { requestAnimationFrame(loop); return; }

    const { w, h, dpr } = fitCanvas(canvas);
    const d = depth / MAX_DEPTH;

    // Velocidad de descenso suavizada → paralaje
    depthVel += ((depth - prevDepth) - depthVel) * 0.08;
    prevDepth = depth;
    const par = depthVel * 0.00035;   // desplazamiento vertical del mundo

    const r = Math.round(4 * (1 - d));
    const g2 = Math.round(30 * (1 - d));
    const b = Math.round(58 * (1 - d) + 4);
    ctx.fillStyle = `rgb(${r}, ${g2}, ${b})`;
    ctx.fillRect(0, 0, w, h);

    if (d < 0.05) {
      const rayAlpha = (0.05 - d) * 2;
      for (let i = 0; i < 5; i++) {
        const rx = ((i / 5) + Math.sin(t * 0.0003 + i) * 0.03) * w;
        const grad = ctx.createLinearGradient(rx, 0, rx + w * 0.06, h);
        grad.addColorStop(0, `rgba(120, 180, 210, ${rayAlpha * 0.18})`);
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

    // Partículas: bajan cuando subes, suben cuando bajas (paralaje por capa z)
    ctx.fillStyle = `rgba(180, 200, 210, ${0.15 + d * 0.1})`;
    for (const m of motes) {
      m.y -= (0.0004 + par) * m.z;
      if (m.y < -0.05) { m.y = 1.05; m.x = Math.random(); }
      if (m.y > 1.05) { m.y = -0.05; m.x = Math.random(); }
      ctx.beginPath();
      ctx.arc(m.x * w, m.y * h, m.s * dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Burbujas: siempre ascienden + paralaje; con anillo de luz
    for (const bu of bubbles) {
      bu.y -= (0.0012 + Math.max(0, par) * 1.6) * bu.z;
      bu.x += Math.sin(t * 0.001 + bu.y * 10) * 0.0003;
      if (bu.y < -0.05) { bu.y = 1.05; bu.x = Math.random(); }
      ctx.strokeStyle = `rgba(190, 215, 225, ${0.18 + d * 0.12})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bu.x * w, bu.y * h, bu.r * dpr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(230, 245, 250, ${0.12 + d * 0.08})`;
      ctx.beginPath();
      ctx.arc(bu.x * w - bu.r * dpr * 0.3, bu.y * h - bu.r * dpr * 0.3, bu.r * dpr * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    if (d > 0.3) {
      const bio = (d - 0.3) / 0.7;
      for (const gl of glows) {
        gl.x += gl.drift;
        gl.y -= par * gl.z;
        if (gl.x < 0) gl.x = 1; if (gl.x > 1) gl.x = 0;
        if (gl.y < -0.05) gl.y = 1.05; if (gl.y > 1.05) gl.y = -0.05;
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
      }
    }

    if (d > 0.1 && Math.random() < 0.004 && creatures.length < 5) spawn(d);
    for (let i = creatures.length - 1; i >= 0; i--) {
      const c = creatures[i];
      if (c.type === 'jelly') {
        c.y -= c.speed * 0.7;
        c.x += Math.sin(c.wave) * 0.0004;
      } else {
        c.x += c.speed * c.dir * (1 + d);
      }
      c.y -= par * c.z;    // paralaje también para criaturas
      c.wave += c.type === 'leviathan' ? 0.012 : 0.03;
      drawCreature(c, w, h, d, t, dpr);
      if (c.x < -0.8 || c.x > 1.8 || c.y < -0.4 || c.y > 1.5) creatures.splice(i, 1);
    }

    // FONDO: a 40 km, lecho marino con el "algo" y letra L
    if (d > 0.985) {
      ctx.fillStyle = 'rgba(8, 8, 9, 0.92)';
      ctx.fillRect(0, h * 0.86, w, h * 0.14);
      ctx.font = `${13 * dpr}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = 'rgba(160, 180, 180, 0.5)';
      ctx.fillText('AQUÍ ABAJO NO HAY NADA. ¿VERDAD?', w * 0.25, h * 0.93);
      riddle.grant(2);
    }

    depthEl.textContent = depth >= 1000
      ? (depth / 1000).toFixed(1) + ' km'
      : Math.round(depth) + ' m';

    if (window.terror) {
      terror.setTension(d);
      if (t - lastSonar > 4000 - d * 2400 && d > 0.05) {
        terror.sonar(d);
        lastSonar = t;
      }
      if (d > 0.7 && Math.random() < 0.0025) terror.scrape();
    }
    window.setCursorTense && setCursorTense(d > 0.65);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();