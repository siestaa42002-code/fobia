/* Aracnofobia — letra 1: aguanta inmóvil con una encima */
(function () {
  const canvas = document.getElementById('canvas-aracno');
  const ctx = canvas.getContext('2d');
  const vis = watchVisible(canvas);

  const mouse = { x: 0.5, y: 0.5, inside: false };
  let lastMove = 0;
  let lastT = 0;

  const spiders = [];
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * Math.PI * 2;
    spiders.push({
      x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.7,
      vx: Math.cos(a) * 0.001, vy: Math.sin(a) * 0.001,
      size: 10 + Math.random() * 14,
      legPhase: Math.random() * Math.PI * 2,
      wanderDir: a,
      wanderT: Math.floor(Math.random() * 80),
      lungeT: Math.floor(Math.random() * 60),
      lunging: false,
      // Sentidos estables: si se recalculan cada frame se invierten y la araña vibra sin avanzar
      orbitDir: Math.random() < 0.5 ? -1 : 1,
      slideDir: 0,
      // Watchdog: posición de referencia y contador
      wdX: 0, wdY: 0, wdT: 90
    });
  }

  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width;
    mouse.y = (e.clientY - r.top) / r.height;
    mouse.inside = true;
    lastMove = performance.now();
  });
  canvas.addEventListener('pointerenter', () => lastMove = performance.now());
  canvas.addEventListener('pointerleave', () => mouse.inside = false);

  function drawSpider(s, w, h, dpr, threat) {
    const x = s.x * w, y = s.y * h;
    const size = s.size * dpr;
    const angle = Math.atan2(s.vy, s.vx);
    const speed = Math.hypot(s.vx, s.vy);
    const bodyCol = `rgba(18, 14, 12, ${0.75 + threat * 0.25})`;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);

    ctx.strokeStyle = bodyCol;
    ctx.lineWidth = Math.max(1, size * 0.09);
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1;
      const idx = i % 4;
      const baseA = side * (0.5 + idx * 0.42);
      const walk = Math.sin(s.legPhase + idx * 1.7 + (side > 0 ? Math.PI : 0)) * 0.25 * (speed * 600 + 0.3);

      const hipX = Math.cos(baseA) * size * 0.5 * side * -1;
      const hipY = Math.sin(baseA) * size * 0.5 - idx * size * 0.14 + size * 0.2;
      const kneeX = hipX + Math.cos(baseA + walk) * size * 1.05 * side * -1;
      const kneeY = hipY - size * 0.5;
      const footX = kneeX + Math.cos(baseA + walk * 1.4) * size * 0.9 * side * -1;
      const footY = kneeY + size * 0.95;

      ctx.beginPath();
      ctx.moveTo(hipX * 0.4, hipY * 0.4);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.stroke();
    }

    ctx.fillStyle = bodyCol;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.35, size * 0.42, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.28, size * 0.3, size * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    if (threat > 0.4) {
      ctx.fillStyle = `rgba(196, 20, 20, ${(threat - 0.4) * 1.6})`;
      ctx.beginPath();
      ctx.arc(-size * 0.09, -size * 0.36, size * 0.05, 0, Math.PI * 2);
      ctx.arc(size * 0.09, -size * 0.36, size * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function loop(t) {
    if (!vis.visible) { lastT = t; requestAnimationFrame(loop); return; }

    // Delta de tiempo normalizado (1 = frame de 60 fps).
    // Si el navegador ahorra frames, el movimiento se compensa.
    const dt = Math.min(3, (t - lastT) / 16.67 || 1);
    lastT = t;

    const { w, h, dpr } = fitCanvas(canvas);

    ctx.fillStyle = 'rgba(5, 5, 5, 0.35)';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(216, 211, 200, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i / 6) * h * 0.4);
      ctx.lineTo((i / 6) * w * 0.4, 0);
      ctx.moveTo(w, h - (i / 6) * h * 0.4);
      ctx.lineTo(w - (i / 6) * w * 0.4, h);
      ctx.stroke();
    }

    const still = mouse.inside ? Math.min(1, (performance.now() - lastMove) / 2500) : 0;
    if (window.terror) terror.setTension(still * 0.8);
    window.setCursorTense && setCursorTense(still > 0.5);

    let anyClose = false;

    for (const s of spiders) {
      // El objetivo se mantiene dentro del área transitable: un cursor pegado al borde es
      // inalcanzable (el rebote las frena antes) y acaban raspando la pared sin avanzar.
      const tgtX = Math.min(0.9, Math.max(0.1, mouse.x));
      const tgtY = Math.min(0.9, Math.max(0.1, mouse.y));
      const dx = tgtX - s.x, dy = tgtY - s.y;
      const dist = Math.hypot(dx, dy) || 0.001;

      let fx = 0, fy = 0, maxSpeed;

      if (mouse.inside && still > 0.08) {
        s.lungeT -= dt;
        if (s.lungeT <= 0) {
          s.lunging = !s.lunging;
          s.lungeT = s.lunging ? 18 + Math.random() * 10 : 25 + Math.random() * 35 * (1.2 - still);
          if (s.lunging && dist < 0.35 && window.terror) terror.skitter(0.6);
        }
        maxSpeed = s.lunging ? 0.005 + still * 0.002 : 0.0012;
        if (dist < 0.06) {
          // Ya está encima: rodea. Si sigue empujando radialmente se amontona y parece quieta.
          fx = (-dy / dist) * maxSpeed * s.orbitDir;
          fy = (dx / dist) * maxSpeed * s.orbitDir;
        } else {
          fx = (dx / dist) * maxSpeed;
          fy = (dy / dist) * maxSpeed;
        }
      } else if (mouse.inside && dist < 0.3) {
        maxSpeed = 0.005;
        fx = (-dx / dist) * maxSpeed;
        fy = (-dy / dist) * maxSpeed;
        s.lunging = false;
        if (dist < 0.2 && window.terror) terror.skitter(0.8);
      } else {
        s.wanderT -= dt;
        if (s.wanderT <= 0) {
          s.wanderDir = Math.atan2(s.vy, s.vx) + (Math.random() - 0.5) * 1.6;
          s.wanderT = 40 + Math.random() * 90;
        }
        maxSpeed = 0.001;
        fx = Math.cos(s.wanderDir) * maxSpeed;
        fy = Math.sin(s.wanderDir) * maxSpeed;
      }

      // Bordes: repulsión + deslizamiento. Huir en línea recta hacia una pared clavaba a la
      // araña contra ella (la fuerza empujaba fuera, el rebote empujaba dentro, y se anulaban).
      const MARGIN = 0.14;
      let bx = 0, by = 0;
      if (s.x < MARGIN) bx += (MARGIN - s.x) / MARGIN;
      if (s.x > 1 - MARGIN) bx -= (s.x - (1 - MARGIN)) / MARGIN;
      if (s.y < MARGIN) by += (MARGIN - s.y) / MARGIN;
      if (s.y > 1 - MARGIN) by -= (s.y - (1 - MARGIN)) / MARGIN;
      // Si el cursor está pegado a la pared, la repulsión se desvanece al llegar a él: si no,
      // empuje de pared y acecho se anulan y la araña tiembla en la esquina. El rebote la contiene.
      const wall = Math.min(1, dist / 0.12);
      fx += bx * wall * maxSpeed * 1.8;
      fy += by * wall * maxSpeed * 1.8;

      if (!bx && !by) s.slideDir = 0;

      let fm = Math.hypot(fx, fy);
      if ((bx || by) && wall > 0.5 && fm < maxSpeed * 0.35) {
        // La huida apunta justo contra la pared: correr en paralelo a ella, no contra ella.
        // El sentido se fija al empezar a deslizar y se mantiene hasta salir del margen.
        const bn = Math.hypot(bx, by);
        const tanX = -by / bn, tanY = bx / bn;
        if (!s.slideDir) s.slideDir = tanX * s.vx + tanY * s.vy < 0 ? -1 : 1;
        fx = tanX * maxSpeed * s.slideDir;
        fy = tanY * maxSpeed * s.slideDir;
        fm = maxSpeed;
      }
      // La dirección puede cambiar; el módulo de la velocidad objetivo nunca es cero.
      if (fm > 1e-6) {
        fx = (fx / fm) * maxSpeed;
        fy = (fy / fm) * maxSpeed;
      }

      s.vx += (fx - s.vx) * 0.12 * dt;
      s.vy += (fy - s.vy) * 0.12 * dt;

      // Velocidad mínima garantizada
      const sp = Math.hypot(s.vx, s.vy);
      if (sp < 0.0006) {
        const a = Math.random() * Math.PI * 2;
        s.vx = Math.cos(a) * 0.0009;
        s.vy = Math.sin(a) * 0.0009;
        s.wanderDir = a;
      }

      s.x += s.vx * dt;
      s.y += s.vy * dt;

      // Rebote vectorial
      if (s.x <= 0.03) { s.x = 0.031; s.vx = Math.abs(s.vx); s.wanderDir = 0; s.wanderT = 20; }
      if (s.x >= 0.97) { s.x = 0.969; s.vx = -Math.abs(s.vx); s.wanderDir = Math.PI; s.wanderT = 20; }
      if (s.y <= 0.03) { s.y = 0.031; s.vy = Math.abs(s.vy); s.wanderDir = Math.PI / 2; s.wanderT = 20; }
      if (s.y >= 0.97) { s.y = 0.969; s.vy = -Math.abs(s.vy); s.wanderDir = -Math.PI / 2; s.wanderT = 20; }

      // WATCHDOG: si en ~1.5 s no se desplazó, patada con rumbo nuevo.
      // También cura estados corruptos (NaN) restaurando la posición.
      s.wdT -= dt;
      if (s.wdT <= 0) {
        if (!isFinite(s.x) || !isFinite(s.y)) {
          s.x = 0.2 + Math.random() * 0.6;
          s.y = 0.2 + Math.random() * 0.6;
        }
        const moved = Math.hypot(s.x - s.wdX, s.y - s.wdY);
        if (moved < 0.012) {
          const a = Math.random() * Math.PI * 2;
          s.vx = Math.cos(a) * 0.0025;
          s.vy = Math.sin(a) * 0.0025;
          s.wanderDir = a;
          s.wanderT = 50;
          s.lunging = true;
          s.lungeT = 15;
        }
        s.wdX = s.x;
        s.wdY = s.y;
        s.wdT = 90;
      }

      s.legPhase += (0.1 + Math.hypot(s.vx, s.vy) * 80) * dt;
      if (dist < 0.1) anyClose = true;

      const threat = Math.max(still, s.lunging ? 0.5 : 0) * Math.max(0, 1 - dist * 2.2);
      drawSpider(s, w, h, dpr, threat);
    }

    if (anyClose && still > 0.4 && window.terror) {
      terror.skitter(still);
      if (still > 0.85) terror.whisper();
    }

    if (anyClose && still >= 0.98) riddle.grant(0);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();