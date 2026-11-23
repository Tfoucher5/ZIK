// Soleil et lumières suivant l'heure réelle, sans dépendance à three.js.
const COULEURS = [
  [5, "#6f86ff"],
  [6.5, "#ff9fb8"],
  [9, "#fff1dc"],
  [17, "#fff1dc"],
  [19.5, "#ffb04d"],
  [21, "#6f86ff"],
];

const hex = (c) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const melange = (a, b, k) =>
  "#" +
  hex(a)
    .map((v, i) =>
      Math.round(v + (hex(b)[i] - v) * k)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");

function teinte(h) {
  if (h <= COULEURS[0][0] || h >= COULEURS.at(-1)[0]) return COULEURS[0][1];
  const k = COULEURS.findIndex(([t]) => t > h);
  const [t0, c0] = COULEURS[k - 1];
  const [t1, c1] = COULEURS[k];
  return melange(c0, c1, (h - t0) / (t1 - t0));
}

// Soleil levé à 6 h, couché à 20 h, plein sud à 13 h. nuit : 0 en plein jour, 1 en pleine nuit.
// position : direction vers le soleil (ou la lune, haute et pâle, la nuit), y vers le haut.
export function soleil(h) {
  const a = ((h - 6) / 14) * Math.PI;
  const haut = Math.sin(a);
  const nuit = Math.min(1, Math.max(0, (0.25 - haut) / 0.4));
  const az = a - Math.PI / 2;
  const position =
    haut > 0
      ? { x: Math.sin(az), y: haut + 0.15, z: Math.cos(az) }
      : { x: -0.4, y: 0.8, z: 0.5 };
  return {
    position,
    couleur: teinte(h),
    intensite: haut > 0 ? 0.6 + 2 * haut : 0.35,
    ciel: 0.45 + 0.75 * (1 - nuit),
    nuit,
  };
}

// Fenêtres d'un niveau : allumées de 8 h à 20 h, et la nuit dès que quelqu'un y est.
export const fenetresAllumees = (h, presents) =>
  presents > 0 || (h >= 8 && h < 20);

export const heureDuPc = (d = new Date()) => d.getHours() + d.getMinutes() / 60;
