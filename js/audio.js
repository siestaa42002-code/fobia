/* ============================================
   audio.js — Motor de terror procedural (Tone.js)
   Buses: general, latido, ambiente, efectos.
   API global: window.terror
   ============================================ */
(function () {
  let ready = false;
  let level = 0;
  let tension = 0;
  let dirty = false;

  const vignette = document.getElementById('heartbeat-vignette');

  let master, heartGain, ambGain, fxGain, reverb;
  let heart, heartLoop;
  let droneSynth, droneFilter, droneGain;
  let noise, noiseFilter, noiseGain;
  let skitterSynth, whisperNoise, subHit, metalSynth, sonarSynth, popSynth;
  let squishNoise, squishFilter, crackNoise;

  async function init() {
    if (ready) return;
    await Tone.start();

    /* --- Buses --- */
    master = new Tone.Gain(0.9).toDestination();
    heartGain = new Tone.Gain(1).connect(master);
    ambGain = new Tone.Gain(1).connect(master);
    fxGain = new Tone.Gain(1).connect(master);
    reverb = new Tone.Reverb({ decay: 7, wet: 0.45 }).connect(fxGain);

    /* --- Latido --- */
    heart = new Tone.MembraneSynth({
      pitchDecay: 0.12, octaves: 3,
      envelope: { attack: 0.001, decay: 0.35, sustain: 0 },
      volume: -13
    }).connect(heartGain);

    heartLoop = new Tone.Loop(time => {
      heart.triggerAttackRelease('A0', '8n', time);
      heart.triggerAttackRelease('G0', '8n', time + 0.22);
      Tone.Draw.schedule(() => {
        vignette.classList.remove('beat');
        void vignette.offsetWidth;
        vignette.classList.add('beat');
      }, time);
    }, '1.1');
    heartLoop.start(0);
    Tone.Transport.start();

    /* --- Ambiente --- */
    droneGain = new Tone.Gain(0).connect(ambGain);
    droneFilter = new Tone.Filter(90, 'lowpass').connect(droneGain);
    droneSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 6, decay: 0, sustain: 1, release: 8 },
      volume: -26
    }).connect(droneFilter);
    droneSynth.triggerAttack(['A0', 'A#0']);

    noiseGain = new Tone.Gain(0).connect(ambGain);
    noiseFilter = new Tone.Filter(400, 'bandpass').connect(noiseGain);
    noise = new Tone.Noise('brown').connect(noiseFilter);
    noise.start();

    /* --- Efectos --- */
    skitterSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.025, sustain: 0 },
      volume: -20
    }).connect(fxGain);

    whisperNoise = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.3, decay: 1.2, sustain: 0, release: 0.6 },
      volume: -19
    }).connect(reverb);

    subHit = new Tone.MembraneSynth({
      pitchDecay: 0.2, octaves: 5,
      envelope: { attack: 0.001, decay: 0.9, sustain: 0 },
      volume: -6
    }).connect(fxGain);

    metalSynth = new Tone.MetalSynth({
      frequency: 80,
      envelope: { attack: 0.15, decay: 1.4, release: 0.4 },
      harmonicity: 8.5, modulationIndex: 40, resonance: 3000, octaves: 1.2,
      volume: -22
    }).connect(reverb);

    sonarSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 1.8, sustain: 0, release: 1.5 },
      volume: -18
    }).connect(reverb);

    popSynth = new Tone.MembraneSynth({
      pitchDecay: 0.03, octaves: 2,
      envelope: { attack: 0.001, decay: 0.12, sustain: 0 },
      volume: -16
    }).connect(reverb);

    // Carne: ruido rosado grave, filtrado bajo, con "resbalón" de tono
    squishFilter = new Tone.Filter(260, 'lowpass').connect(fxGain);
    squishNoise = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.012, decay: 0.22, sustain: 0, release: 0.1 },
      volume: -14
    }).connect(squishFilter);

    // Pared quebrándose: estallido de ruido seco
    crackNoise = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.05 },
      volume: -12
    }).connect(fxGain);

    setInterval(() => {
      if (dirty) { dirty = false; apply(); }
    }, 250);

    ready = true;
    dirty = true;
  }

  function apply() {
    if (!ready) return;
    const f = Math.min(1, level / 5 + tension * 0.35);

    heartLoop.interval = Math.max(0.43, 1.1 - f * 0.67);
    heart.volume.rampTo(-13 + f * 5, 0.5);

    droneGain.gain.rampTo(level === 0 ? 0 : 0.25 + f * 0.55, 2.5);
    droneFilter.frequency.rampTo(90 + f * 160, 2);

    noiseGain.gain.rampTo(level === 0 ? 0 : 0.05 + f * 0.12, 3);
    noiseFilter.frequency.rampTo(400 + f * 900, 2);
  }

  let lastSkitter = 0, lastWhisper = 0, lastPop = 0, lastScrape = 0, lastSquish = 0, lastCrack = 0;

  window.terror = {
    init,

    setLevel(l) {
      level = l;
      tension = 0;
      dirty = true;
    },

    setTension(t) {
      const nt = Math.max(0, Math.min(1, t));
      if (Math.abs(nt - tension) < 0.02) return;
      tension = nt;
      dirty = true;
    },

    setBus(name, v) {
      if (!ready) return;
      const buses = { general: master, latido: heartGain, ambiente: ambGain, efectos: fxGain };
      const bus = buses[name];
      if (!bus) return;
      const base = name === 'general' ? 0.9 : 1;
      bus.gain.rampTo(v * base, 0.3);
    },

    skitter(intensity = 0.5) {
      if (!ready) return;
      const now = Tone.now();
      if (now - lastSkitter < 0.15) return;
      lastSkitter = now;
      const n = 2 + Math.floor(intensity * 4);
      for (let i = 0; i < n; i++) {
        skitterSynth.triggerAttackRelease('64n', now + i * (0.03 + Math.random() * 0.04));
      }
    },

    whisper() {
      if (!ready) return;
      const now = Tone.now();
      if (now - lastWhisper < 2.5) return;
      lastWhisper = now;
      whisperNoise.triggerAttackRelease('2n');
    },

    hit() {
      if (!ready) return;
      subHit.triggerAttackRelease('C0', '4n');
    },

    scrape() {
      if (!ready) return;
      const now = Tone.now();
      if (now - lastScrape < 1.2) return;
      lastScrape = now;
      metalSynth.triggerAttackRelease('C1', '2n');
    },

    sonar(depth = 0) {
      if (!ready) return;
      sonarSynth.volume.value = -18 - depth * 6;
      sonarSynth.triggerAttackRelease(440 - depth * 260, '2n');
    },

    pop() {
      if (!ready) return;
      const now = Tone.now();
      if (now - lastPop < 0.09) return;
      lastPop = now;
      popSynth.triggerAttackRelease(70 + Math.random() * 90, '16n');
    },

    // Carne chocando / frotándose: doble golpe húmedo con filtro variable
    squish() {
      if (!ready) return;
      const now = Tone.now();
      if (now - lastSquish < 0.22) return;
      lastSquish = now;
      squishFilter.frequency.value = 180 + Math.random() * 220;
      squishNoise.triggerAttackRelease('8n', now);
      squishNoise.triggerAttackRelease('16n', now + 0.09 + Math.random() * 0.05);
      popSynth.triggerAttackRelease(55 + Math.random() * 30, '16n', now + 0.02);
    },

    // Pared quebrándose: crujidos secos escalonados + golpe grave
    crack(intensity = 0.5) {
      if (!ready) return;
      const now = Tone.now();
      if (now - lastCrack < 0.8) return;
      lastCrack = now;
      const n = 2 + Math.floor(intensity * 3);
      for (let i = 0; i < n; i++) {
        crackNoise.triggerAttackRelease('32n', now + i * (0.05 + Math.random() * 0.09));
      }
      subHit.triggerAttackRelease(intensity > 0.6 ? 'B0' : 'D1', '8n', now + 0.04);
    },

    glitch() {
      if (!ready) return;
      metalSynth.triggerAttackRelease('G1', '8n');
      subHit.triggerAttackRelease('C0', '8n', Tone.now() + 0.05);
    }
  };

  /* ---------- Panel de opciones ---------- */
  const panel = document.getElementById('sound-panel');
  const panelBtn = document.getElementById('sound-panel-btn');

  panelBtn.addEventListener('click', () => panel.classList.toggle('open'));

  document.querySelectorAll('#sound-panel input[type="range"]').forEach(s => {
    s.addEventListener('input', () => terror.setBus(s.dataset.bus, s.value / 100));
  });
})();