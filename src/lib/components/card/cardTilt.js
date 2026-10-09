const clamp = (v) => Math.min(1, Math.max(0, v));

/**
 * Incline une carte selon le pointeur, le doigt ou le gyroscope.
 * Écrit la rotation (--rx, --ry), puis en déduit la position du reflet
 * (--mx, --my) et l'angle du reflet des sillons (--sheen) : la lumière dépend
 * de l'inclinaison de la carte, pas de la position du pointeur.
 */
export function cardTilt(node, params) {
  let opts = { enabled: true, strength: 1, gyro: false, ...params };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;

  function apply(px, py) {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const rx = (0.5 - py) * 20 * opts.strength;
      const ry = (px - 0.5) * 26 * opts.strength;
      node.classList.add("is-tilting");
      node.style.setProperty("--rx", `${rx}deg`);
      node.style.setProperty("--ry", `${ry}deg`);
      node.style.setProperty("--mx", `${50 + (ry / 13) * 50}%`);
      node.style.setProperty("--my", `${50 - (rx / 10) * 50}%`);
      node.style.setProperty("--sheen", `${35 + ry * 6 - rx * 3.5}deg`);
    });
  }

  function reset() {
    cancelAnimationFrame(frame);
    node.classList.remove("is-tilting");
    for (const p of ["--mx", "--my", "--rx", "--ry", "--sheen"])
      node.style.removeProperty(p);
  }

  const active = () => opts.enabled && !reduced.matches;

  function onMove(e) {
    if (!active() || opts.gyro) return;
    const r = node.getBoundingClientRect();
    apply(
      clamp((e.clientX - r.left) / r.width),
      clamp((e.clientY - r.top) / r.height),
    );
  }

  function onLeave() {
    if (!opts.gyro) reset();
  }

  function onOrient(e) {
    if (!active() || e.gamma == null) return;
    apply(clamp(0.5 + e.gamma / 50), clamp(0.5 + (e.beta - 40) / 50));
  }

  function syncGyro() {
    window.removeEventListener("deviceorientation", onOrient);
    if (opts.gyro) window.addEventListener("deviceorientation", onOrient);
    else reset();
  }

  node.addEventListener("pointermove", onMove);
  node.addEventListener("pointerleave", onLeave);
  syncGyro();

  return {
    update(next) {
      const gyroChanged = next.gyro !== opts.gyro;
      opts = { ...opts, ...next };
      if (!opts.enabled) reset();
      if (gyroChanged) syncGyro();
    },
    destroy() {
      cancelAnimationFrame(frame);
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("deviceorientation", onOrient);
    },
  };
}

/** iOS demande une autorisation explicite pour lire le gyroscope. */
export async function requestGyro() {
  const D = globalThis.DeviceOrientationEvent;
  if (typeof D?.requestPermission === "function")
    return (await D.requestPermission().catch(() => "denied")) === "granted";
  return !!D;
}
