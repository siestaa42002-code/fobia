/* Claustrofobia — la puerta: sobrevive y recibe la pista */
(function () {
  const canvas = document.getElementById('canvas-claustro');
  const ctx = canvas.getContext('2d');
  const vis = watchVisible(canvas);

  let closure = 0;
  let lastMove = performance.now();
  let lastScrapeAt = 0;
  let lastCrackLevel = 0;
  let blackoutUntil = 0;         // ciclo de "muerte" al cerrarse del todo
  let survived = 0;
  const mouse = { x: 0.5, y: 0.5 };
  const focus = { x: 0.5, y: 0.5 };

  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width;
    mouse.y = (e.clientY - r.top) / r.height;
    lastMove = performance.now();
  });
  canvas.addEventListener('pointerdown', () => lastMove = performance.now());

  function drawCrack(x0, y0, angle, len, seed, intensity) {
    const pts = [{ x: x0, y: y0 }];
    let x = x0, y = y0, a = angle;
    const segs = 5 + Math.floor(intensity * 6);
    for (let i = 0; i < segs; i++) {
      a += Math.sin(seed * (i + 3)) * 0.55;
      const step = len / segs;
      x += Math.cos(a) * step;
      y += Math.sin(a) * step;
      pts.push({ x, y });
    }

    ctx.strokeStyle = `rgba(4, 3, 3, ${0.5 + intensity * 0.4})`;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();

    ctx.strokeStyle = `rgba(216, 211, 200, ${0.08 + intensity * 0.22})`;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x + 1.4, p.y + 1.4) : ctx.lineTo(p.x + 1.4, p.y + 1.4));
    ctx.stroke();

    for (let i = 2; i < pts.length - 1; i++) {
      if (Math.sin(seed * (i + 9)) > 0.5) {
        const p = pts[i];
        const ba = a + (Math.sin(seed * i) > 0 ? 1.1 : -1.1);
        ctx.strokeStyle = `rgba(4, 3, 3, ${0.4 + intensity * 0.3})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(ba) * len * 0.16, p.y + Math.sin(ba) * len * 0.16);
        ctx.stroke();
      }
    }
  }

  function loop(t) {
    if (!vis.visible) { requestAnimationFrame(loop); return; }

    const { w, h, dpr } = fitCanvas(canvas);

    // Ciclo de apagón: si te encerró, oscuridad total 2 s con mensaje, y renace
    if (t < blackoutUntil) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      const breathe = 0.3 + Math.abs(Math.sin(t * 0.003)) * 0.35;
      ctx.font = `${14 * dpr}px 'Special Elite', cursive`;
      ctx.fillStyle = `rgba(160, 20, 20, ${breathe})`;
      const msg = survived >= 1
        ? 'LO QUE BUSCAS SE ESCRIBE AL FINAL DEL DESCENSO'
        : 'TE LO ADVERTIMOS. NO TE QUEDES QUIETO.';
      ctx.fillText(msg, w / 2 - msg.length * 3.6 * dpr, h / 2);
      requestAnimationFrame(loop);
      return;
    }

    const still = (performance.now() - lastMove) / 1000;
    if (still > 1.2) {
      closure = Math.min(1, closure + 0.0016 + closure * 0.001);
    } else {
      closure = Math.max(0, closure - 0.011);   // retroceso más rápido (antes se sentía atascado)
    }

    // Cierre total: apagón, golpe, reinicio limpio
    if (closure >= 0.96) {
      survived++;
      blackoutUntil = t + 2400;
      closure = 0.2;
      lastMove = performance.now();
      lastCrackLevel = 0;
      if (window.terror) { terror.hit(); terror.crack(1); terror.whisper(); }
      if (window.glitchFlash) glitchFlash();
      requestAnimationFrame(loop);
      return;
    }

    focus.x += (mouse.x - focus.x) * 0.03;
    focus.y += (mouse.y - focus.y) * 0.03;

    const crackLevel = Math.floor(closure / 0.15);
    if (crackLevel > lastCrackLevel && window.terror) terror.crack(closure);
    lastCrackLevel = crackLevel;

    ctx.fillStyle = '#0d0c0a';
    ctx.fillRect(0, 0, w, h);

    const openW = w * (1 - closure);
    const openH = h * (1 - closure);
    const ox = Math.max(0, Math.min(w - openW, focus.x * w - openW / 2));
    const oy = Math.max(0, Math.min(h - openH, focus.y * h - openH / 2));

    const px = mouse.x * w, py = mouse.y * h;
    const panic = closure > 0.55;
    const breathR = (14 + Math.sin(t * (0.004 + closure * 0.014)) * (4 + closure * 4)) * dpr;
    const lightCol = panic
      ? `rgba(200, ${Math.round(160 - closure * 120)}, ${Math.round(140 - closure * 120)}, `
      : 'rgba(216, 211, 200, ';
    const pg = ctx.createRadialGradient(px, py, 0, px, py, breathR * 4 * (1 - closure * 0.4));
    pg.addColorStop(0, lightCol + (0.5 - closure * 0.15) + ')');
    pg.addColorStop(1, 'transparent');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(px, py, breathR * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = lightCol + '0.9)';
    ctx.beginPath();
    ctx.arc(px, py, breathR * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#181512';
    ctx.fillRect(0, 0, ox, h);
    ctx.fillRect(ox + openW, 0, w - ox - openW, h);
    ctx.fillRect(ox, 0, openW, oy);
    ctx.fillRect(ox, oy + openH, openW, h - oy - openH);

    ctx.fillStyle = 'rgba(216, 211, 200, 0.07)';
    if (ox > 3) ctx.fillRect(ox - 2 * dpr, 0, 2 * dpr, h);
    if (w - ox - openW > 3) ctx.fillRect(ox + openW, 0, 2 * dpr, h);
    if (oy > 3) ctx.fillRect(ox, oy - 2 * dpr, openW, 2 * dpr);
    if (h - oy - openH > 3) ctx.fillRect(ox, oy + openH, openW, 2 * dpr);

    if (closure > 0.08) {
      const n = 2 + Math.floor(closure * 8);
      for (let i = 0; i < n; i++) {
        const seed = i * 13.7 + 3.1;
        const side = i % 4;
        let cx2, cy2, ang;
        if (side === 0) { cx2 = ox; cy2 = (0.15 + (i / n) * 0.7) * h; ang = Math.PI; }
        else if (side === 1) { cx2 = ox + openW; cy2 = (0.2 + (i / n) * 0.6) * h; ang = 0; }
        else if (side === 2) { cx2 = ox + (0.15 + (i / n) * 0.7) * openW; cy2 = oy; ang = -Math.PI / 2; }
        else { cx2 = ox + (0.2 + (i / n) * 0.6) * openW; cy2 = oy + openH; ang = Math.PI / 2; }
        drawCrack(cx2, cy2, ang, (60 + closure * 140) * dpr, seed, closure);
      }
    }

    if (closure > 0.35) {
      ctx.fillStyle = `rgba(120, 105, 90, ${closure * 0.4})`;
      for (let i = 0; i < Math.floor(closure * 10); i++) {
        const dx = ox + Math.random() * openW;
        const dy = oy + ((t * 0.1 + i * 137) % openH);
        ctx.fillRect(dx, dy, 1.5 * dpr, 3 * dpr);
      }
    }

    if (closure > 0.6) {
      canvas.style.transform = `translate(${(Math.random() - 0.5) * closure * 5}px, ${(Math.random() - 0.5) * closure * 5}px)`;
    } else {
      canvas.style.transform = '';
    }

    if (window.terror) {
      terror.setTension(closure);
      if (closure > 0.25 && t - lastScrapeAt > 2600 - closure * 1400) {
        terror.scrape();
        lastScrapeAt = t;
      }
    }
    window.setCursorTense && setCursorTense(closure > 0.45);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();