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
