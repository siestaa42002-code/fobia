/* Claustrofobia — las paredes se cierran, crujen y se agrietan */
(function () {
  const canvas = document.getElementById('canvas-claustro');
  const ctx = canvas.getContext('2d');
  const vis = watchVisible(canvas);

  let closure = 0;
  let lastMove = performance.now();
  let lastScrapeAt = 0;
  let lastCrackLevel = 0;          // último umbral de crujido disparado
  const mouse = { x: 0.5, y: 0.5 };

  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width;
    mouse.y = (e.clientY - r.top) / r.height;
    lastMove = performance.now();
  });
  canvas.addEventListener('pointerdown', () => lastMove = performance.now());

  function drawWallTexture(x0, y0, wW, wH, seedBase, cracks) {
    ctx.strokeStyle = 'rgba(10, 9, 8, 0.65)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const seed = seedBase * 13.7 + i * 7.3;
      let px = x0 + ((Math.sin(seed) + 1) / 2) * wW;
      let py = y0;
      ctx.beginPath();
      ctx.moveTo(px, py);
      for (let s = 0; s < 6; s++) {
        px += Math.sin(seed * (s + 2)) * wW * 0.08;
        py += wH / 6;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Grietas activas: más y más brillantes cuanto más se cierra
    if (cracks > 0.05) {
      const n = Math.floor(cracks * 9);
      ctx.strokeStyle = `rgba(216, 211, 200, ${0.1 + cracks * 0.25})`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < n; i++) {
        const seed = seedBase * 31.3 + i * 17.9;
        let px = x0 + ((Math.sin(seed * 3) + 1) / 2) * wW;
        let py = y0 + ((Math.cos(seed * 5) + 1) / 2) * wH * 0.5;
        ctx.beginPath();
        ctx.moveTo(px, py);
        const segs = 3 + Math.floor(cracks * 5);
        for (let s = 0; s < segs; s++) {
          px += Math.sin(seed * (s + 7)) * wW * 0.12;
          py += (Math.cos(seed * (s + 3)) * 0.4 + 0.6) * wH * 0.09;
          ctx.lineTo(px, py);
          // Ramificación
          if (Math.sin(seed * (s + 11)) > 0.55) {
            ctx.moveTo(px, py);
            ctx.lineTo(px + Math.sin(seed * s) * wW * 0.07, py + wH * 0.05);
            ctx.moveTo(px, py);
          }
        }
        ctx.stroke();
      }
    }
  }

  function loop(t) {
    if (!vis.visible) { requestAnimationFrame(loop); return; }

    const { w, h, dpr } = fitCanvas(canvas);

    const still = (performance.now() - lastMove) / 1000;
    if (still > 1.2) {
      closure = Math.min(0.88, closure + 0.0016 + closure * 0.001);
    } else {
      closure = Math.max(0, closure - 0.006);
    }

    // Crujidos de pared al cruzar umbrales (0.2, 0.35, 0.5, 0.65, 0.8)
    const crackLevel = Math.floor(closure / 0.15);
    if (crackLevel > lastCrackLevel && window.terror) {
      terror.crack(closure);
    }
    lastCrackLevel = crackLevel;

    ctx.fillStyle = '#0d0c0a';
    ctx.fillRect(0, 0, w, h);

    // La luz del "ocupante": se debilita y enrojece al cerrarse
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

    const wallX = (w / 2) * closure;
    const wallY = (h / 2) * closure;

    ctx.fillStyle = '#181512';
    ctx.fillRect(0, 0, wallX, h);
    ctx.fillRect(w - wallX, 0, wallX, h);
    ctx.fillRect(0, 0, w, wallY);
    ctx.fillRect(0, h - wallY, w, wallY);

    if (wallX > 4) {
      drawWallTexture(0, 0, wallX, h, 1, closure);
      drawWallTexture(w - wallX, 0, wallX, h, 2, closure);
      ctx.fillStyle = 'rgba(216, 211, 200, 0.07)';
      ctx.fillRect(wallX - 2 * dpr, 0, 2 * dpr, h);
      ctx.fillRect(w - wallX, 0, 2 * dpr, h);
    }
    if (wallY > 4) {
      drawWallTexture(0, 0, w, wallY, 3, closure);
      drawWallTexture(0, h - wallY, w, wallY, 4, closure);
      ctx.fillStyle = 'rgba(216, 211, 200, 0.07)';
      ctx.fillRect(0, wallY - 2 * dpr, w, 2 * dpr);
      ctx.fillRect(0, h - wallY, w, 2 * dpr);
    }

    // Polvo cayendo de las paredes cuando crujen
    if (closure > 0.35) {
      ctx.fillStyle = `rgba(120, 105, 90, ${closure * 0.4})`;
      for (let i = 0; i < Math.floor(closure * 10); i++) {
        const dx = wallX + Math.random() * (w - wallX * 2);
        const dy = wallY + ((t * 0.1 + i * 137) % (h - wallY * 2));
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