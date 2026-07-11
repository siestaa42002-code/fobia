/* Nictofobia — la sombra que es más oscura que la oscuridad */
(function () {
  const canvas = document.getElementById('canvas-nicto');
  const ctx = canvas.getContext('2d');
  const vis = watchVisible(canvas);

  const mouse = { x: 0.5, y: 0.5, inside: false };

  let objects = [];
  function scatter() {
    objects = [];
    for (let i = 0; i < 9; i++) {
      objects.push({
        x: 0.08 + Math.random() * 0.84,
        y: 0.12 + Math.random() * 0.76,
        type: Math.floor(Math.random() * 2)
      });
    }
  }
  scatter();

  const entity = { x: 0.8, y: 0.5 };
  let entityCooldown = 0;

  function relocateEntity() {
    let nx, ny, tries = 0;
    do {
      nx = 0.08 + Math.random() * 0.84;
      ny = 0.12 + Math.random() * 0.76;
      tries++;
    } while (Math.hypot(nx - mouse.x, ny - mouse.y) < 0.45 && tries < 20);
    entity.x = nx;
    entity.y = ny;
  }

  let flicker = 1;
  let blackoutUntil = 0;

  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width;
    mouse.y = (e.clientY - r.top) / r.height;
    mouse.inside = true;
  });
  canvas.addEventListener('pointerleave', () => mouse.inside = false);

  function drawObject(o, w, h, dpr, alpha) {
    const x = o.x * w, y = o.y * h;
    const s = 30 * dpr;
    ctx.strokeStyle = `rgba(200, 195, 185, ${alpha * 0.8})`;
    ctx.lineWidth = 1.5;

    if (o.type === 0) {
      ctx.strokeRect(x - s * 0.5, y - s * 0.3, s, s * 0.5);
      ctx.beginPath();
      ctx.moveTo(x - s * 0.5, y - s * 0.3); ctx.lineTo(x - s * 0.5, y - s * 1.1);
      ctx.moveTo(x + s * 0.5, y - s * 0.3); ctx.lineTo(x + s * 0.5, y - s * 1.1);
      ctx.moveTo(x - s * 0.5, y + s * 0.2); ctx.lineTo(x - s * 0.5, y + s * 0.8);
      ctx.moveTo(x + s * 0.5, y + s * 0.2); ctx.lineTo(x + s * 0.5, y + s * 0.8);
      ctx.stroke();
    } else {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(0.12);
      ctx.strokeRect(-s * 0.6, -s * 0.8, s * 1.2, s * 1.6);
      ctx.strokeRect(-s * 0.4, -s * 0.6, s * 0.8, s * 1.2);
      ctx.restore();
    }
  }

  function drawEntity(w, h, dpr, alpha) {
    const x = entity.x * w, y = entity.y * h;
    const s = 36 * dpr;

    // Silueta NEGRA PURA: recorta la luz que hay detrás
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, alpha * 2)})`;
    ctx.beginPath();
    ctx.arc(x, y - s * 1.15, s * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y + s * 1.2);
    ctx.quadraticCurveTo(x - s * 0.62, y - s * 0.6, x, y - s * 0.85);
    ctx.quadraticCurveTo(x + s * 0.62, y - s * 0.6, x + s * 0.5, y + s * 1.2);
    ctx.closePath();
    ctx.fill();

    // Dos puntos rojos tenues: te está mirando
    if (alpha > 0.2) {
      ctx.fillStyle = `rgba(160, 15, 15, ${(alpha - 0.2) * 1.1})`;
      ctx.beginPath();
      ctx.arc(x - s * 0.1, y - s * 1.18, s * 0.05, 0, Math.PI * 2);
      ctx.arc(x + s * 0.1, y - s * 1.18, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop(t) {
    if (!vis.visible) { requestAnimationFrame(loop); return; }

    const { w, h, dpr } = fitCanvas(canvas);

    ctx.fillStyle = '#010101';
    ctx.fillRect(0, 0, w, h);

    if (t > blackoutUntil) {
      flicker = 1;
      if (Math.random() < 0.006) {
        blackoutUntil = t + 250 + Math.random() * 900;
        flicker = 0;
        scatter();
        relocateEntity();
        if (window.terror) { terror.whisper(); terror.setTension(0.9); }
        window.setCursorTense && setCursorTense(true);
      }
    } else {
      flicker = Math.random() < 0.2 ? 0.25 : 0;
    }

    if (t > blackoutUntil && flicker === 1) {
      if (window.terror) terror.setTension(0.25);
      window.setCursorTense && setCursorTense(false);
    }

    const mx = mouse.x * w, my = mouse.y * h;
    const R = 130 * dpr * (0.85 + Math.sin(t * 0.01) * 0.08) * flicker;

    if (mouse.inside && R > 1) {
      // 1. LA LUZ PRIMERO: ilumina el fondo
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, R);
      g.addColorStop(0, `rgba(190, 175, 145, ${0.32 * flicker})`);
      g.addColorStop(0.55, `rgba(190, 175, 145, ${0.1 * flicker})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // 2. Los objetos, sobre el fondo iluminado
      for (const o of objects) {
        const d = Math.hypot(o.x * w - mx, o.y * h - my);
        const alpha = Math.max(0, 1 - d / R);
        if (alpha > 0.03) drawObject(o, w, h, dpr, alpha);
      }

      // 3. EL ENTE: negro puro que recorta la luz (ahora sí visible)
      const de = Math.hypot(entity.x * w - mx, entity.y * h - my);
      const ea = Math.max(0, 1 - de / (R * 1.25));
      if (ea > 0.03) {
        drawEntity(w, h, dpr, ea);
        if (ea > 0.5 && t > entityCooldown) {
          entityCooldown = t + 1000;
          if (window.terror) {
            terror.hit();
            terror.whisper();
            terror.setTension(1);
          }
          window.setCursorTense && setCursorTense(true);
          setTimeout(relocateEntity, 220);   // se deja ver un instante y huye
        }
      }
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();