// Sons de la TV : vrais enregistrements libres de droits (static/sounds,
// provenance et licences dans static/sounds/CREDITS.txt)
export const SOUNDS = {
  buzz: "/sounds/buzz.ogg",
  drumroll: "/sounds/drumroll.ogg",
};

export function playSound(src, volume = 1) {
  const a = new Audio(src);
  a.volume = Math.min(1, Math.max(0, volume));
  a.play().catch(() => {});
  return a;
}

// Suite d'une séquence : à la fin du son, ou après `ms` s'il n'a pas pu jouer
export function afterSound(audio, ms, fn) {
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    clearTimeout(t);
    fn();
  };
  const t = setTimeout(go, ms);
  audio.addEventListener("ended", go, { once: true });
  return () => {
    done = true;
    clearTimeout(t);
    audio.pause();
  };
}
