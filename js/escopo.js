/* Escopofobia — letra D: descubre al que no debería estar ahí */
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
      open: 0,
      phase: Math.random() * Math.PI * 2
    });
  }
  let impostor = Math.floor(Math.random() * N);   // invisible: se ve IGUAL a los demás

  let globalBlinkUntil = 0;
  let nextBlink = 4000 + Math.random() * 5000;
  let caught = false;            // estás demasiado cerca del impostor
  let flickerT = 0;
  const screenCracks = [];       // grietas del "vidrio" de la pantalla
  let discovered = false;

  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width;
    mouse.y = (e.clientY - r.top) / r.height;
    mouse.inside = true;
  });
  canvas.addEventListener('pointerleave', () => mouse.inside = false);

  function addScreenCrack(x, y, w, h) {
    const segs = [];
    let px = x, py = y;
    let a = Math.random() * Math.PI * 2;
    const n = 6 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      segs.push({ x: px, y: py });
      a += (Math.random() - 0.5) * 1.2;
      px += Math.cos(a) * (0.05 + Math.random() * 0.09) * w;
      py += Math.sin(a) * (0.05 + Math.random() * 0.09) * h;
    }
    screenCracks.push(segs);
  }

  function drawEye(eye, isImpostor, w, h, dpr) {
    const x = eye.x * w, y = eye.y * h;
    const s = eye.size * dpr;
    const open = eye.open;
    if (open < 0.02) return;

    const eh = s * 0.55 * open;

    ctx.fillStyle = 'rgba(205, 198, 185, 0.85)';
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.quadraticCurveTo(x, y - eh, x + s, y);
    ctx.quadraticCurveTo(x, y + eh, x - s, y);
    ctx.fill();

    const dx = mouse.x * w - x, dy = mouse.y * h - y;
    const dd = Math.hypot(dx, dy) || 1;
    const track = Math.min(s * 0.32, dd * 0.1);
    const ix = x + (dx / dd) * track;
    const iy = y + (dy / dd) * track * open;

    // El impostor SOLO se delata cuando ya te atrapó (caught)
    const showRed = isImpostor && caught;
    ctx.fillStyle = showRed ? 'rgba(150, 12, 12, 0.95)' : 'rgba(55, 45, 35, 0.95)';
    ctx.beginPath();
    ctx.arc(ix, iy, s * 0.3 * Math.min(1, open * 1.4), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(3, 3, 3, 0.95)';
    ctx.beginPath();
    ctx.arc(ix, iy, s * 0.14 * Math.min(1, open * 1.4), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 250, ${0.35 * open})`;
    ctx.beginPath();
    ctx.arc(ix - s * 0.06, iy - s * 0.07, s * 0.045, 0, Math.PI * 2);
    ctx.fill();

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
    if (!vis.visible) {
      if (caught) { caught = false; window.setCursorSlow && setCursorSlow(false); }
      requestAnimationFrame(loop);
      return;
    }

    const { w, h, dpr } = fitCanvas(canvas);

    ctx.fillStyle = '#070606';
    ctx.fillRect(0, 0, w, h);

    nextBlink -= 16;
    if (nextBlink <= 0) {
      globalBlinkUntil = t + 160;
      nextBlink = 4000 + Math.random() * 6000;
      if (window.terror) terror.blink();
    }
    const blinking = t < globalBlinkUntil;

    const imp = eyes[impostor];
    const dImp = Math.hypot(imp.x - mouse.x, imp.y - mouse.y);

    // ¿Te acercaste demasiado al impostor?
    if (mouse.inside && dImp < 0.09 && !caught) {
      caught = true;
      discovered = true;
      addScreenCrack(imp.x * w, imp.y * h, w, h);
      if (screenCracks.length > 5) screenCracks.shift();
      if (window.terror) { terror.hit(); terror.crack(0.9); terror.setTension(1); }
      window.setCursorSlow && setCursorSlow(true);
      window.setCursorTense && setCursorTense(true);
      riddle.grant(4);   // letra D: lo descubriste
    }

    // Mientras estés cerca: la pantalla parpadea sin parar
    if (caught) {
      flickerT -= 16;
      if (flickerT <= 0) {
        if (window.glitchFlash) glitchFlash();
        flickerT = 380 + Math.random() * 400;
      }
      // Solo te suelta cuando te alejas de verdad
      if (dImp > 0.3 || !mouse.inside) {
        caught = false;
        window.setCursorSlow && setCursorSlow(false);
        window.setCursorTense && setCursorTense(false);
        if (window.terror) terror.setTension(0.4);
        // Cambia de ojo EN SILENCIO: vuelve a ser indistinguible
        impostor = Math.floor(Math.random() * N);
      }
    }

    let openCount = 0;

    eyes.forEach((eye, i) => {
      const d = Math.hypot(eye.x - mouse.x, eye.y - mouse.y);
      // TODOS (incluido el impostor) se comportan igual: cerca = cerrarse
      let target = mouse.inside ? (d < 0.16 ? 0 : Math.min(1, (d - 0.16) * 4)) : 0.7;
      if (blinking) target = 0;
      // Excepto cuando el impostor te atrapó: se abre de par en par
      if (i === impostor && caught) target = 1;

      eye.open += (target - eye.open) * 0.12;
      if (eye.open > 0.5) openCount++;
      drawEye(eye, i === impostor, w, h, dpr);
    });

    // Grietas del vidrio de tu pantalla
    if (screenCracks.length) {
      ctx.strokeStyle = 'rgba(230, 225, 215, 0.5)';
      ctx.lineWidth = 1.4 * dpr;
      for (const segs of screenCracks) {
        ctx.beginPath();
        segs.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(120, 115, 105, 0.3)';
      ctx.lineWidth = 3 * dpr;
      for (const segs of screenCracks) {
        ctx.beginPath();
        segs.forEach((p, i) => i === 0 ? ctx.moveTo(p.x + 2, p.y + 2) : ctx.lineTo(p.x + 2, p.y + 2));
        ctx.stroke();
      }
    }

    if (window.terror && !caught) terror.setTension((openCount / N) * 0.6);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();