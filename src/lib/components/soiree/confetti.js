const COULEURS = ["#ff00ff", "#f4c542", "#ffffff", "#2fb8ff", "#ff8af5"];

/** Pluie de confettis de 2,4 s sur `cv` ; renvoie la fonction qui l'arrête. */
export function confetti(cv, n = 110, duree = 2400) {
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(2, devicePixelRatio || 1);
  const ctx = cv.getContext("2d");
  if (!ctx) return () => {};
  cv.width = r.width * dpr;
  cv.height = r.height * dpr;
  ctx.scale(dpr, dpr);
  const ps = Array.from({ length: n }, () => ({
    x: r.width * (0.3 + Math.random() * 0.4),
    y: r.height * 0.45,
    vx: (Math.random() - 0.5) * r.width * 0.02,
    vy: -r.height * (0.012 + Math.random() * 0.02),
    a: Math.random() * 6,
    va: (Math.random() - 0.5) * 0.3,
    c: COULEURS[(Math.random() * COULEURS.length) | 0],
    w: 4 + Math.random() * 5,
  }));
  const t0 = performance.now();
  let raf = 0;
  const frame = (now) => {
    const k = (now - t0) / duree;
    ctx.clearRect(0, 0, r.width, r.height);
    if (k >= 1) return;
    ctx.globalAlpha = 1 - k * k;
    for (const q of ps) {
      q.vy += r.height * 0.0009;
      q.x += q.vx;
      q.y += q.vy;
      q.a += q.va;
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(q.a);
      ctx.fillStyle = q.c;
      ctx.fillRect(-q.w / 2, -q.w / 4, q.w, q.w / 2);
      ctx.restore();
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, r.width, r.height);
  };
}
