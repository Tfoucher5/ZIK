// Sens des meubles d'après leur pièce (convention dans mobilier-base.js) : rotation y du modèle, en coordonnées du plan.
const VISES = {
  canape: ["table-basse", "ecran"],
  "rang-de-sieges": ["ecran", "scene"],
  regie: ["scene", "ecran"],
  console: ["scene", "ecran"],
  chaise: ["table", "ronde", "grande-table", "poste", "ilot"],
  projecteur: ["ecran"],
  banque: [],
  banc: [],
};
// Usager côté salle : le +z local se tourne vers le public (les rangs pour une scène) ou le centre de la pièce.
const COTE_SALLE = new Set(["scene", "borne", "bar", "comptoir", "cabine"]);

export const milieu = (m) =>
  "x1" in m
    ? [(m.x1 + m.x2) / 2, (m.y1 + m.y2) / 2]
    : m.type === "ilot"
      ? [m.x + m.n * 0.8, m.y + 0.75]
      : m.w === undefined
        ? [m.x, m.y]
        : [m.x + m.w / 2, m.y + m.h / 2];

const centre = (poly) => [
  poly.reduce((s, p) => s + p[0], 0) / poly.length,
  poly.reduce((s, p) => s + p[1], 0) / poly.length,
];

function plusProche(m, piece, types) {
  const [x, y] = milieu(m);
  for (const t of types) {
    const c = piece.mobilier
      .filter((o) => o !== m && o.type === t && !o.d)
      .map(milieu)
      .sort(
        (a, b) =>
          Math.hypot(a[0] - x, a[1] - y) - Math.hypot(b[0] - x, b[1] - y),
      );
    if (c.length) return c[0];
  }
  return null;
}

// Point que l'usager regarde (signe -1 : le -z local y pointe) ou vers lequel le meuble s'ouvre (signe 1 : le +z local).
export function cible(m, piece) {
  if (VISES[m.type])
    return {
      point: plusProche(m, piece, VISES[m.type]) ?? centre(piece.poly),
      signe: -1,
    };
  if (COTE_SALLE.has(m.type))
    return {
      point:
        (m.type === "scene" && plusProche(m, piece, ["rang-de-sieges"])) ||
        centre(piece.poly),
      signe: 1,
    };
  return null;
}

// Rotation y : un rectangle garde son grand côté sur x local (0 ou π à plat, ±π/2 debout), une chaise vise exactement.
export function rotation(m, piece) {
  const rect = m.w !== undefined;
  const debout = rect && m.w < m.h;
  const base = debout ? Math.PI / 2 : 0;
  const c = piece && cible(m, piece);
  if (!c || (!rect && !VISES[m.type]?.length)) return base;
  const [x, y] = milieu(m);
  const [dx, dy] = [c.point[0] - x, c.point[1] - y];
  if (!rect) return Math.atan2(-dx, -dy);
  const choix = debout ? [Math.PI / 2, -Math.PI / 2] : [0, Math.PI];
  const score = (t) => c.signe * (Math.sin(t) * dx + Math.cos(t) * dy);
  return score(choix[1]) > score(choix[0]) + 1e-6 ? choix[1] : choix[0];
}

// Point local (lx, lz) d'un meuble de centre (x, y) tourné de t, ramené dans le plan.
export const versPlan = (x, y, t, lx, lz) => [
  x + lx * Math.cos(t) + lz * Math.sin(t),
  y - lx * Math.sin(t) + lz * Math.cos(t),
];
