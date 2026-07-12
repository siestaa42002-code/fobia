# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

FOBIA: experiencia web interactiva de scroll sobre siete fobias. Todo el audio y los visuales son
**procedurales** (Canvas 2D + Tone.js); no hay assets binarios, ni imágenes ni ficheros de sonido.
Los textos de la interfaz están en español y el código se comenta en español — mantén ese idioma.

## Ejecutar

No hay build, ni bundler, ni tests, ni `package.json`. Es un sitio estático puro: hay que servirlo
por HTTP (no `file://`, porque `crypto.subtle` del acertijo requiere contexto seguro).

```bash
python -m http.server 8000   # luego abrir http://localhost:8000
```

Las dependencias (GSAP + ScrollTrigger, Lenis, Tone.js) se cargan por CDN desde `index.html`; no se
instalan localmente. Verificar cambios = abrir la página, pulsar ENTRAR (obligatorio: desbloquea el
AudioContext) y hacer scroll hasta la sección afectada.

## Arquitectura

Sin módulos ES ni imports. Cada `js/*.js` es una IIFE que se autoejecuta al cargar y publica lo que
necesite en `window`. El orden de `<script>` en `index.html` es la única gestión de dependencias:
`main.js` y `audio.js` deben ir antes que las escenas, porque estas usan sus globales al arrancar.

- **`main.js`** — infraestructura compartida. Expone `fitCanvas(canvas)` (redimensiona a DPR y
  devuelve `{w, h, dpr}`), `watchVisible(el)` (objeto `{visible}` mantenido por IntersectionObserver),
  el cursor personalizado, la capa de glitch y el objeto `riddle`. `initScroll()` monta Lenis + GSAP
  ScrollTrigger y el observer que escribe `body[data-fear]` (0–7).
- **`audio.js`** — expone `window.terror`, el motor de terror. Único punto de contacto con Tone.js.
- **`js/{aracno,nicto,talaso,tripo,escopo,espejo,claustro}.js`** — una escena por fobia, una por
  `<section class="fear-section">` de `index.html`, cada una dueña de su `<canvas id="canvas-*">`.

### Escenas (canvas)

Todas siguen el mismo patrón; cópialo al añadir o modificar una:

```js
(function () {
  const canvas = document.getElementById('canvas-x');
  const ctx = canvas.getContext('2d');
  const vis = watchVisible(canvas);          // no dibujar fuera de pantalla

  function loop(t) {
    if (!vis.visible) { requestAnimationFrame(loop); return; }
    const { w, h, dpr } = fitCanvas(canvas); // cada frame: el canvas puede haber cambiado de tamaño
    // ... coordenadas de estado en 0..1, multiplicadas por w/h y dpr al dibujar
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
```

Convenciones que se repiten y conviene respetar:

- El estado se guarda en coordenadas normalizadas (0..1) y solo se escala a píxeles al pintar, para
  que un `resize` no rompa la simulación.
- El movimiento se multiplica por un `dt` normalizado (`(t - lastT) / 16.67`, cap ~3) donde importa
  la física, para que un navegador que ahorra frames no ralentice la escena.
- Las llamadas a audio se guardan tras `if (window.terror)`: la escena debe funcionar aunque el
  usuario nunca haya pulsado ENTRAR y el motor no esté inicializado.
- Los efectos de `terror` ya llevan su propio throttle interno (`lastSkitter`, `lastPop`, …), así que
  se pueden invocar desde el bucle de render sin miedo a saturarlos.

### Motor de audio (`window.terror`)

Todo es síntesis en vivo. Cuatro buses (`master`/`heartGain`/`ambGain`/`fxGain`) mapeados al panel de
sonido por `setBus(name, 0..1)` con los nombres `general | latido | ambiente | efectos`.

La intensidad global sale de dos entradas que combina `apply()` en `f = level/7 + tension*0.35`:

- `setLevel(n)` — la fobia activa (0–7); la dispara el observer de scroll de `main.js` y **resetea la
  tensión a 0**. Controla el drone, el ruido de fondo y el ritmo base del latido.
- `setTension(0..1)` — lo urgente dentro de la escena (una araña encima, la pared cerrándose). Lo
  llama cada escena desde su bucle. Los cambios se acumulan en un flag `dirty` y se aplican cada
  250 ms, no por frame.

Efectos puntuales: `skitter`, `blink`, `whisper`, `hit`, `scrape`, `sonar`, `pop`, `squish`, `crack`,
`glitch`, más `setFriction(0..1)` (ruido continuo mientras haya contacto; hay que ponerlo a 0 al salir
de la escena, como hace `tripo.js`).

### El acertijo

La palabra oculta es de 6 letras y **no aparece en texto plano**: `main.js` guarda sus bytes en `ENC`
XOR-eados con la clave 42, y la validación compara SHA-256 (`crypto.subtle`) en vez del texto. El HUD
superior muestra un `_` por letra.

Cada escena "regala" una letra al completar su reto llamando a `riddle.grant(i)`, donde `i` es una
posición **fija** en la palabra — no reordenes las secciones sin reasignar los índices:

| índice | escena | reto |
|---|---|---|
| 0 | aracno | quedarse inmóvil con una araña encima |
| 1 | nicto | iluminar al ente 3 veces |
| 2 | talaso | tocar el fondo (40 000 m) |
| 3 | tripo | saturar la superficie (`MAX_HOLES`) |
| 4 | escopo | encontrar el ojo intruso |
| 5 | espejo | provocar 3 traiciones del reflejo |

`claustro` no da letra: es la pista final. El input del `#exit` valida contra el hash y muestra
`#freed`.

## CSS

`css/styles.css` define la paleta y, sobre todo, `--fear-level`: un escalar 0–1 derivado en cascada de
`body[data-fear="0..7"]`. Viñeta, latido, tipografía y colores lo interpolan con `calc()`. Si añades
una sección, hay que añadir también su regla `body[data-fear="N"]` y su `data-fear-id` en el HTML.
