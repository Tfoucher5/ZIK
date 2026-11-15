/**
 * Boucle rAF qui ne tourne que si `el` est visible et l'onglet affiché.
 * `frame(dt, now)` reçoit le temps écoulé en secondes (plafonné à 0,1 s).
 * Renvoie la fonction d'arrêt.
 */
export function visibleLoop(
  el,
  frame,
  { threshold = 0.35, rootMargin = "0px" } = {},
) {
  let id = 0;
  let seen = false;
  let prev = 0;
  const tick = (now) => {
    id = requestAnimationFrame(tick);
    const dt = prev ? Math.min(0.1, (now - prev) / 1000) : 0;
    prev = now;
    frame(dt, now);
  };
  const sync = () => {
    const on = seen && !document.hidden;
    if (on && !id) {
      prev = 0;
      id = requestAnimationFrame(tick);
    } else if (!on && id) {
      cancelAnimationFrame(id);
      id = 0;
    }
  };
  const io = new IntersectionObserver(
    ([e]) => {
      seen = e.isIntersecting;
      sync();
    },
    { threshold, rootMargin },
  );
  io.observe(el);
  document.addEventListener("visibilitychange", sync);
  return () => {
    io.disconnect();
    document.removeEventListener("visibilitychange", sync);
    cancelAnimationFrame(id);
    id = 0;
  };
}
