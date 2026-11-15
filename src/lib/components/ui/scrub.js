import { visibleLoop } from "./loop.js";

const GESTES = ["scroll", "pointerdown", "keydown", "touchstart"];

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/** 0 quand le haut de la scène touche le haut de l'écran, 1 quand son bas touche le bas. */
export function progress(top, height, viewport) {
  const span = height - viewport;
  if (span <= 0) return top <= 0 ? 1 : 0;
  return clamp(-top / span);
}

/** Lissage indépendant de la cadence d'images : 1 - exp(-dt * k). */
export function smooth(current, target, dt, k = 8) {
  const next = current + (target - current) * (1 - Math.exp(-dt * k));
  return Math.abs(target - next) < 0.0005 ? target : next;
}

export function pickSource(sources, portrait) {
  return (
    (portrait ? sources.portrait : sources.paysage) ??
    sources.paysage ??
    sources.portrait
  );
}

/** Instant à viser, ou null si la vidéo y est déjà (évite un seek inutile). */
export function seekTarget(p, duration, current) {
  if (!(duration > 0)) return null;
  const t = Math.min(duration - 0.05, p * duration);
  return Math.abs(current - t) > 0.02 ? t : null;
}

/**
 * Pilote `video` par le scroll de `host`. La source n'est posée qu'après la page
 * chargée, au premier geste ou après `delay` ms, et jamais en économie de données.
 * Un seul seek à la fois ; sans métadonnées en 4 s, la vidéo tourne en boucle.
 */
export function scrub(
  host,
  video,
  { sources, onprogress, k = 8, delay = 2500 },
) {
  const saveData = !!navigator.connection?.saveData;
  let armed = false;
  let asked = false;
  let ready = false;
  let seeking = false;
  let looping = false;
  let sp = 0;
  let armTimer = 0;
  let fallback = 0;

  const arm = () => {
    armed = true;
    GESTES.forEach((ev) => removeEventListener(ev, arm));
  };
  const onLoad = () => {
    GESTES.forEach((ev) => addEventListener(ev, arm, { passive: true }));
    armTimer = setTimeout(arm, delay);
  };
  if (document.readyState === "complete") onLoad();
  else addEventListener("load", onLoad, { once: true });

  const onSeeked = () => (seeking = false);
  const onData = () => {
    if (looping) return;
    clearTimeout(fallback);
    ready = true;
    video.pause();
  };

  function load() {
    asked = true;
    video.addEventListener("loadeddata", onData, { once: true });
    video.addEventListener("seeked", onSeeked);
    video.src = pickSource(
      sources,
      matchMedia("(orientation: portrait)").matches,
    );
    video.load();
    // iOS ne décode pas une vidéo jamais lue : lecture muette aussitôt mise en pause
    video.play().then(
      () => !looping && video.pause(),
      () => {},
    );
    fallback = setTimeout(() => {
      if (ready) return;
      looping = true;
      video.loop = true;
      video.play().catch(() => {});
    }, 4000);
  }

  const stop = visibleLoop(
    host,
    (dt) => {
      if (armed && !asked && !saveData) load();
      const r = host.getBoundingClientRect();
      sp = smooth(sp, progress(r.top, r.height, innerHeight), dt, k);
      onprogress?.(sp);
      if (!ready || seeking) return;
      const t = seekTarget(sp, video.duration, video.currentTime);
      if (t === null) return;
      seeking = true;
      video.currentTime = t;
    },
    { threshold: 0, rootMargin: "60% 0px" },
  );

  return () => {
    stop();
    clearTimeout(armTimer);
    clearTimeout(fallback);
    removeEventListener("load", onLoad);
    GESTES.forEach((ev) => removeEventListener(ev, arm));
    video.removeEventListener("loadeddata", onData);
    video.removeEventListener("seeked", onSeeked);
  };
}
