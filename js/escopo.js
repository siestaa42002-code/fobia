/* Escopofobia — los ojos que te siguen */
(function () {
  const canvas = document.getElementById('canvas-escopo');
  const ctx = canvas.getContext('2d');
  const vis = watchVisible(canvas);

  const mouse = { x: 0.5, y: 0.5, inside: false };

  const eyes = [];
  const N = 22;
  for (let i = 0; i < N; i++) {
    eyes.push({
      x: 0.06 + Math.random() * 0.88,
      y: 0.08 + Math.random() * 0.84,
      size: 12 + Math.random() * 16,
      open: 0,                       // 0 cerrado, 1 abierto
      phase: Math.random() * Math.PI * 2,
      red: false
    });
  }
  // EL OJO ROJO: uno solo, el que no debería estar ahí
  eyes[Math.floor(Math.random() * N)].red = true;

  let globalBlinkUntil = 0;
  let nextBlink = 4000 + Math.random() * 5000;
  let redCooldown = 0;

  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width;
    mouse.y = (e.clientY - r.top) / r.height;
    mouse.inside = true;
  });
  canvas.addEventListener('pointerleave', () => mouse.inside = false);

  function drawEye(eye, w, h, dpr, t) {
    const x = eye.x * w, y = eye.y * h;
    const s = eye.size * dpr;
    const open = eye.open;
    if (open < 0.02) return;

    // Forma almendrada: la apertura escala la altura
    const eh = s * 0.55 * open;

    ctx.fillStyle = 'rgba(205, 198, 185, 0.85)';
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.quadraticCurveTo(x, y - eh, x + s, y);
    ctx.quadraticCurveTo(x, y + eh, x - s, y);
    ctx.fill();

    // Iris que TE SIGUE
    const dx = mouse.x * w - x, dy = mouse.y * h - y;
    const dd = Math.hypot(dx, dy) || 1;
    const track = Math.min(s * 0.32, dd * 0.1);
    const ix = x + (dx / dd) * track;
    const iy = y + (dy / dd) * track * open;

    ctx.fillStyle = eye.red ? 'rgba(150, 12, 12, 0.95)' : 'rgba(55, 45, 35, 0.95)';
    ctx.beginPath();
    ctx.arc(ix, iy, s * 0.3 * Math.min(1, open * 1.4), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(3, 3, 3, 0.95)';
    ctx.beginPath();
    ctx.arc(ix, iy, s * 0.14 * Math.min(1, open * 1.4), 0, Math.PI * 2);
    ctx.fill();

    // Brillo
    ctx.fillStyle = `rgba(255, 255, 250, ${0.35 * open})`;
    ctx.beginPath();
    ctx.arc(ix - s * 0.06, iy - s * 0.07, s * 0.045, 0, Math.PI * 2);
    ctx.fill();

    // Párpados (líneas que cierran el ojo)
    ctx.strokeStyle = 'rgba(20, 16, 14, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.quadraticCurveTo(x, y - eh, x + s, y);
    ctx.moveTo(x - s, y);
    ctx.quadraticCurveTo(x, y + eh, x + s, y);
    ctx.stroke();
  }

  function loop(t) {
    if (!vis.visible) { requestAnimationFrame(loop); return; }

    const { w, h, dpr } = fitCanvas(canvas);

    ctx.fillStyle = '#070606';
    ctx.fillRect(0, 0, w, h);

    // Parpadeo colectivo
    nextBlink -= 16;
    if (nextBlink <= 0) {
      globalBlinkUntil = t + 160;
      nextBlink = 4000 + Math.random() * 6000;
      if (window.terror) terror.blink();
    }
    const blinking = t < globalBlinkUntil;

    let openCount = 0;
    let redVisible = false;

    for (const eye of eyes) {
      const d = Math.hypot(eye.x - mouse.x, eye.y - mouse.y);

      // Se cierran si te acercas; se abren si estás lejos
      let target = mouse.inside ? (d < 0.16 ? 0 : Math.min(1, (d - 0.16) * 4)) : 0.7;
      if (blinking) target = 0;
      // El ojo rojo hace lo contrario: se abre MÁS cuando te acercas
      if (eye.red && mouse.inside) target = d < 0.3 ? 1 : 0.15;

      eye.open += (target - eye.open) * 0.12;
      if (eye.open > 0.5) openCount++;
      if (eye.red && eye.open > 0.7 && Math.hypot(eye.x - mouse.x, eye.y - mouse.y) < 0.18) redVisible = true;

      drawEye(eye, w, h, dpr, t);
    }

    // El ojo rojo te atrapó mirándolo
    if (redVisible && t > redCooldown && window.terror) {
      redCooldown = t + 3000;
      terror.hit();
      terror.whisper();
    }

    if (window.terror) terror.setTension((openCount / N) * 0.7 + (redVisible ? 0.3 : 0));
    window.setCursorTense && setCursorTense(redVisible);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();