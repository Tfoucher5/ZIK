// Le son de l'accueil : un groove synthétisé (118 à la minute), étouffé dehors, qui
// s'ouvre quand on passe la porte. Rien n'est créé avant le geste du joueur.
const S16 = 60 / 118 / 4;
const ROOT = [55, 43.65, 65.41, 49];
const CH = [
  [220, 261.6, 329.6, 392],
  [174.6, 220, 261.6, 329.6],
  [196, 261.6, 329.6, 493.9],
  [196, 246.9, 293.7, 440],
];

export function createSon() {
  let ctx, master, lp, noise, timer;
  let t0 = 0;
  let step = 0;
  let open = 0;
  let vol = 1;

  const env = (g, t, a, d, peak) => {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0008, t + a + d);
  };
  function osc(type, f, t, d, peak, dest = lp, f2) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d * 0.5);
    env(g, t, 0.004, d, peak);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + d + 0.05);
  }
  function bruit(t, d, peak, type, f) {
    const s = ctx.createBufferSource();
    const fl = ctx.createBiquadFilter();
    const g = ctx.createGain();
    s.buffer = noise;
    fl.type = type;
    fl.frequency.value = f;
    env(g, t, 0.002, d, peak);
    s.connect(fl).connect(g).connect(lp);
    s.start(t);
    s.stop(t + d + 0.05);
  }
  function tick() {
    while (t0 < ctx.currentTime + 0.14) {
      const s = step % 16;
      const bar = (step >> 4) % 4;
      if (s % 4 === 0) osc("sine", 150, t0, 0.26, 0.9, lp, 44);
      if (s % 4 === 2) bruit(t0, 0.07, 0.16, "highpass", 7500);
      else if (s % 2 === 1) bruit(t0, 0.025, 0.05, "highpass", 9000);
      if (s === 4 || s === 12) bruit(t0, 0.14, 0.3, "bandpass", 1700);
      if ([0, 3, 6, 10, 11, 14].includes(s))
        osc("sawtooth", ROOT[bar] * (s === 11 ? 2 : 1), t0, 0.16, 0.22);
      if (s === 3 || s === 6 || s === 11)
        CH[bar].forEach((f, i) =>
          osc(i % 2 ? "triangle" : "sawtooth", f * 2, t0, 0.22, 0.05),
        );
      t0 += S16;
      step++;
    }
  }
  function regle() {
    if (!ctx) return;
    const t = ctx.currentTime;
    lp.frequency.setTargetAtTime(170 * Math.pow(95, open), t, 0.09);
    master.gain.setTargetAtTime(vol * (0.42 + 0.3 * open), t, 0.12);
  }
  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 0.8;
    lp.frequency.value = 170;
    lp.connect(master)
      .connect(ctx.createDynamicsCompressor())
      .connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  return {
    get on() {
      return !!timer;
    },
    start() {
      if (!ctx) init();
      ctx.resume();
      t0 = ctx.currentTime + 0.06;
      step = 0;
      timer = setInterval(tick, 40);
      regle();
    },
    stop() {
      clearInterval(timer);
      timer = null;
      if (!ctx) return;
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      setTimeout(() => !timer && ctx.suspend(), 400);
    },
    /** x : ouverture du filtre (0 dehors, 1 dedans) ; v : volume. */
    ouvre(x, v) {
      if (Math.abs(x - open) < 0.004 && Math.abs(v - vol) < 0.01) return;
      open = x;
      vol = v;
      regle();
    },
    ding() {
      if (!timer) return;
      const t = ctx.currentTime;
      [
        [880, 0],
        [1108.7, 0.08],
        [1318.5, 0.16],
        [1760, 0.26],
      ].forEach(([f, d]) => osc("sine", f, t + d, 0.5, 0.16, master));
    },
  };
}
