/* Aracnofobia — arañas procedurales que acechan al cursor quieto */
(function () {
  const canvas = document.getElementById('canvas-aracno');
  const ctx = canvas.getContext('2d');
  const vis = watchVisible(canvas);

  const mouse = { x: 0.5, y: 0.5, inside: false };
  let lastMove = 0;

  const SPIDERS = 5;
  const spiders = [];

  for (let i = 0; i < SPIDERS; i++) {
    spiders.push({
      x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.7,
      angle: Math.random() * Math.PI * 2,
      speed: 0,
      size: 10 + Math.random() * 14,
      legPhase: Math.random() * Math.PI * 2,
      jitterT: 0
    });
  }

  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width;
    mouse.y = (e.clientY - r.top) / r.height;
    mouse.inside = true;
    lastMove = performance.now();
  });
  canvas.addEventListener('pointerleave', () => mouse.inside = false);

  function drawSpider(s, w, h, dpr, threat) {
    const x = s.x * w, y = s.y * h;
    const size = s.size * dpr;
    const bodyCol = `rgba(18, 14, 12, ${0.75 + threat * 0.25})`;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(s.angle + Math.PI / 2);

    ctx.strokeStyle = bodyCol;
    ctx.lineWidth = Math.max(1, size * 0.09);
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1;
      const idx = i % 4;
      const baseA = side * (0.5 + idx * 0.42);
      const walk = Math.sin(s.legPhase + idx * 1.7 + (side > 0 ? Math.PI : 0)) * 0.25 * (s.speed * 600 + 0.3);

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

    if (threat > 0.55) {
      ctx.fillStyle = `rgba(196, 20, 20, ${(threat - 0.55) * 2.2})`;
      ctx.beginPath();
      ctx.arc(-size * 0.09, -size * 0.36, size * 0.05, 0, Math.PI * 2);
      ctx.arc(size * 0.09, -size * 0.36, size * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function loop(t) {
    if (!vis.visible) { requestAnimationFrame(loop); return; }

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
      const dx = mouse.x - s.x, dy = mouse.y - s.y;
      const dist = Math.hypot(dx, dy);

      if (mouse.inside && still > 0.15) {
        const targetA = Math.atan2(dy, dx);
        let da = targetA - s.angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        s.angle += da * 0.04;
        s.speed = 0.00025 + still * 0.0011;
      } else if (mouse.inside && dist < 0.3) {
        s.angle = Math.atan2(-dy, -dx) + (Math.random() - 0.5) * 0.6;
        s.speed = 0.004;
        if (dist < 0.2 && window.terror) terror.skitter(0.8);
      } else {
        s.jitterT -= 1;
        if (s.jitterT <= 0) {
          s.angle += (Math.random() - 0.5) * 1.4;
          s.jitterT = 40 + Math.random() * 100;
        }
        s.speed = 0.0006 + Math.random() * 0.0003;   // nunca cero
      }

      s.x += Math.cos(s.angle) * s.speed;
      s.y += Math.sin(s.angle) * s.speed;

      // REBOTE en los bordes: refleja el ángulo (antes se quedaban clavadas)
      if (s.x <= 0.03 || s.x >= 0.97) {
        s.angle = Math.PI - s.angle + (Math.random() - 0.5) * 0.5;
        s.x = Math.max(0.031, Math.min(0.969, s.x));
        s.jitterT = 30;
      }
      if (s.y <= 0.03 || s.y >= 0.97) {
        s.angle = -s.angle + (Math.random() - 0.5) * 0.5;
        s.y = Math.max(0.031, Math.min(0.969, s.y));
        s.jitterT = 30;
      }

      s.legPhase += 0.12 + s.speed * 90;

      if (dist < 0.12) anyClose = true;

      const threat = still * Math.max(0, 1 - dist * 2.5);
      drawSpider(s, w, h, dpr, threat);
    }

    if (anyClose && still > 0.4 && window.terror) {
      terror.skitter(still);
      if (still > 0.85) terror.whisper();
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();