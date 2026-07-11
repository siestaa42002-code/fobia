/* Eisoptrofobia — el reflejo que deja de imitarte */
(function () {
  const canvas = document.getElementById('canvas-espejo');
  const ctx = canvas.getContext('2d');
  const vis = watchVisible(canvas);

  const mouse = { x: 0.3, y: 0.5, inside: false };
  const trail = [];              // historial para el retraso del reflejo

  // Estado del reflejo: normal → lag → traición → normal
  let state = 'normal';
  let stateUntil = 0;
  let nextEpisode = 9000;
  let betrayals = 0;
  const reflex = { x: 0.7, y: 0.5 };
  const cracks = [];

  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width;
    mouse.y = (e.clientY - r.top) / r.height;
    mouse.inside = true;
  });
  canvas.addEventListener('pointerleave', () => mouse.inside = false);

  function addCrack(w, h) {
    // Grieta desde el centro del espejo
    const segs = [];
    let x = 0.5 + (Math.random() - 0.5) * 0.1;
    let y = 0.4 + Math.random() * 0.2;
    let a = Math.random() * Math.PI * 2;
    for (let i = 0; i < 7; i++) {
      segs.push({ x, y });
      a += (Math.random() - 0.5) * 1.1;
      x += Math.cos(a) * (0.04 + Math.random() * 0.06);
      y += Math.sin(a) * (0.04 + Math.random() * 0.06);
    }
    cracks.push(segs);
  }

  function drawDot(x, y, w, h, dpr, isReflex, corrupted) {
    const px = x * w, py = y * h;
    const col = corrupted ? 'rgba(160, 20, 20,' : (isReflex ? 'rgba(170, 165, 155,' : 'rgba(225, 218, 200,');
    const g = ctx.createRadialGradient(px, py, 0, px, py, 46 * dpr);
    g.addColorStop(0, col + '0.5)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, 46 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col + '0.95)';
    ctx.beginPath();
    ctx.arc(px, py, 5 * dpr, 0, Math.PI * 2);
    ctx.fill();
  }

  function loop(t) {
    if (!vis.visible) { requestAnimationFrame(loop); return; }

    const { w, h, dpr } = fitCanvas(canvas);

    // Habitación a oscuras
    ctx.fillStyle = '#0a0908';
    ctx.fillRect(0, 0, w, h);

    // El espejo: mitad derecha, con marco y tinte
    const mid = w / 2;
    ctx.fillStyle = 'rgba(14, 16, 18, 0.9)';
    ctx.fillRect(mid, 0, w - mid, h);
    ctx.strokeStyle = 'rgba(90, 80, 65, 0.8)';
    ctx.lineWidth = 6 * dpr;
    ctx.strokeRect(mid + 3 * dpr, 3 * dpr, w - mid - 6 * dpr, h - 6 * dpr);
    // Línea divisoria (el vidrio)
    ctx.strokeStyle = 'rgba(216, 211, 200, 0.15)';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(mid, 0);
    ctx.lineTo(mid, h);
    ctx.stroke();

    // Historial del cursor (para el modo "lag")
    trail.push({ x: mouse.x, y: mouse.y, t });
    while (trail.length > 90) trail.shift();

   // Máquina de estados del reflejo
    nextEpisode -= 16;
    if (state === 'normal' && nextEpisode <= 0 && mouse.inside) {
      state = Math.random() < 0.5 ? 'lag' : 'betrayal';
      stateUntil = t + (state === 'lag' ? 2200 : 2600);
      nextEpisode = 9000 + Math.random() * 11000;
      if (window.terror) { terror.whisper(); terror.setTension(1); }
      window.setCursorTense && setCursorTense(true);
    }
    if (state !== 'normal' && t > stateUntil) {
      if (state === 'betrayal') {
        betrayals++;
        if (window.terror) terror.crack(0.7);
        if (betrayals <= 3) addCrack(w, h);
        if (betrayals >= 3) riddle.grant(5);
      }
      state = 'normal';
      if (window.terror) terror.setTension(0.4);
      window.setCursorTense && setCursorTense(false);
    }

    // Posición objetivo del reflejo
    let targetX, targetY;
    if (state === 'lag') {
      // Sigue tu posición de hace ~0.7 s
      const old = trail[Math.max(0, trail.length - 45)];
      targetX = 1 - old.x;
      targetY = old.y;
    } else if (state === 'betrayal') {
      // Deja de imitarte y se acerca al vidrio, hacia tu altura
      targetX = 0.53;
      targetY = mouse.y + Math.sin(t * 0.002) * 0.04;
    } else {
      targetX = 1 - mouse.x;
      targetY = mouse.y;
    }
    reflex.x += (targetX - reflex.x) * (state === 'betrayal' ? 0.012 : 0.25);
    reflex.y += (targetY - reflex.y) * (state === 'betrayal' ? 0.012 : 0.25);

    // Tú (solo en tu mitad)
    if (mouse.inside && mouse.x < 0.5) {
      drawDot(mouse.x, mouse.y, w, h, dpr, false, false);
    }

    // El reflejo (solo dentro del espejo)
    if (mouse.inside && reflex.x > 0.5) {
      drawDot(reflex.x, reflex.y, w, h, dpr, true, state === 'betrayal');
    }

    // Grietas acumuladas
    if (cracks.length) {
      ctx.strokeStyle = 'rgba(216, 211, 200, 0.35)';
      ctx.lineWidth = 1.2 * dpr;
      for (const segs of cracks) {
        ctx.beginPath();
        segs.forEach((p, i) => {
          const px = (0.5 + p.x * 0.5) * w * (p.x > 1 ? 0 : 1) || (0.5 + Math.min(0.98, p.x) * 0.5) * w;
          i === 0 ? ctx.moveTo((0.5 + p.x / 2) * w, p.y * h) : ctx.lineTo((0.5 + p.x / 2) * w, p.y * h);
        });
        ctx.stroke();
      }
    }

    if (window.terror && state === 'normal') terror.setTension(0.35);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();