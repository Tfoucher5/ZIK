// Structure de la tour lue dans le plan, sans three : trame, dalles, façades, dessertes, coupe.
import { E2, NIVEAUX, NOYAU, TRAME, VIDES } from "../tour/plan.js";

const W = TRAME.largeur;
const P = TRAME.profondeur;
const EPS = 0.01;
const egal = (a, b) => Math.abs(a - b) < EPS;
const indice = (id) => NIVEAUX.findIndex((n) => n.id === id);

export const DALLE = 0.3;

// 1 béton/moquette, 2 chêne/laiton, 3 marbre/noyer/or.
export const gamme = (n) =>
  /marbre|\bor\b/i.test(n.matieres)
    ? 3
    : /laiton|fumé/i.test(n.matieres)
      ? 2
      : 1;

export const emprise = (n) => [n.x0, 0, W, P];

export const poteaux = (n) =>
  n.facade === false
    ? []
    : TRAME.x
        .filter((x) => x >= n.x0 - EPS)
        .flatMap((x) => TRAME.y.map((y) => [x, y]));

export const pieux = () => TRAME.x.flatMap((x) => TRAME.y.map((y) => [x, y]));

// [x1, y1, x2, y2] des rectangles du plan (cabines et volées sont en [x, y, l, p]).
const xyxy = ([x, y, l, p]) => [x, y, x + l, y + p];
const englobe = (rects) => [
  Math.min(...rects.map((r) => r[0])),
  Math.min(...rects.map((r) => r[1])),
  Math.max(...rects.map((r) => r[2])),
  Math.max(...rects.map((r) => r[3])),
];

const tremies = () => [
  ...NOYAU.ascenseurs.map((a) => ({
    rect: xyxy(a.cabine),
    dessert: a.dessert,
  })),
  ...NOYAU.escaliers.map((e) => ({
    rect: englobe(e.volees.map(xyxy)),
    dessert: e.dessert,
  })),
  { rect: E2.rect, dessert: E2.dessert },
];

const traverse = (dessert, z) => {
  const zs = dessert.map((id) => NIVEAUX[indice(id)].z);
  return z > Math.min(...zs) + EPS && z <= Math.max(...zs) + EPS;
};

// Dalle posée sous le sol fini du niveau i : elle couvre aussi le toit du niveau inférieur.
export function dalle(i) {
  const n = NIVEAUX[i];
  const x = i === 0 ? n.x0 : NIVEAUX[i - 1].x0;
  const vides = VIDES.filter((v) => v.niveau === n.id);
  return {
    rect: [x, 0, W, P],
    trous: [
      ...vides.filter((v) => v.type !== "eau").map((v) => v.rect),
      ...tremies()
        .filter((t) => traverse(t.dessert, n.z))
        .map((t) => t.rect),
    ],
    verrieres: vides.filter((v) => v.type === "verriere").map((v) => v.rect),
  };
}

// Façades du contour de l'emprise, nommées par orientation (le sud regarde la caméra).
export function facades(n) {
  const [x1, y1, x2, y2] = emprise(n);
  const type = n.facade === "porteur" ? "porteur" : "rideau";
  return [
    { cote: "nord", x1, y1, x2, y2: y1, type },
    { cote: "est", x1: x2, y1, x2, y2, type },
    { cote: "sud", x1, y1: y2, x2, y2, type },
    { cote: "ouest", x1, y1, x2: x1, y2, type },
  ];
}

// Bords du toit laissé à l'air libre par le niveau i (retrait du suivant, ou toit final).
export function acroteres(i) {
  const n = NIVEAUX[i];
  const haut = NIVEAUX[i + 1];
  if (!haut) {
    const [x1, y1, x2, y2] = emprise(n);
    return [
      [x1, y1, x2, y1],
      [x2, y1, x2, y2],
      [x1, y2, x2, y2],
      [x1, y1, x1, y2],
    ];
  }
  if (haut.x0 <= n.x0 + EPS) return [];
  return [
    [n.x0, 0, haut.x0, 0],
    [n.x0, P, haut.x0, P],
    [n.x0, 0, n.x0, P],
  ];
}

// Garde-corps d'une terrasse : ses bords hors façade du niveau et hors édicule.
export function gardeCorps(terrasse, n) {
  const ed = E2.edicules?.[n.id];
  const sur = (a, b) =>
    (egal(a[0], b[0]) &&
      (egal(a[0], n.x0) || (ed && (egal(a[0], ed[0]) || egal(a[0], ed[2]))))) ||
    (egal(a[1], b[1]) && ed && (egal(a[1], ed[1]) || egal(a[1], ed[3])));
  const p = terrasse.poly;
  return p
    .map((a, k) => [a, p[(k + 1) % p.length]])
    .filter(([a, b]) => !sur(a, b))
    .map(([a, b]) => [a[0], a[1], b[0], b[1]]);
}

// Découpe un mur [x1, y1, x2, y2] aux ouvertures { x, y, l, axe } posées sur sa ligne.
export function percer([x1, y1, x2, y2], ouvertures) {
  const horiz = egal(y1, y2);
  const fixe = horiz ? y1 : x1;
  let a = Math.min(horiz ? x1 : y1, horiz ? x2 : y2);
  const b = Math.max(horiz ? x1 : y1, horiz ? x2 : y2);
  const trous = ouvertures
    .filter((o) => (o.axe === "h") === horiz && egal(horiz ? o.y : o.x, fixe))
    .map((o) => [horiz ? o.x : o.y, (horiz ? o.x : o.y) + o.l])
    .filter(([d, f]) => f > a + EPS && d < b - EPS)
    .sort((u, v) => u[0] - v[0]);
  const morceaux = [];
  for (const [d, f] of trous) {
    if (d > a + EPS) morceaux.push([a, d]);
    a = Math.max(a, f);
  }
  if (b > a + EPS) morceaux.push([a, b]);
  return morceaux.map(([d, f]) =>
    horiz ? [d, fixe, f, fixe] : [fixe, d, fixe, f],
  );
}

// Murs du noyau (contour et refends) d'un niveau, percés des portes palières qui y servent, des escaliers et des sanitaires.
export function mursNoyau(id) {
  const [x1, y1, x2, y2] = NOYAU.rect;
  const ouvertures = [
    ...[...NOYAU.ascenseurs, ...NOYAU.escaliers]
      .filter((a) => a.dessert.includes(id))
      .map((a) => a.porte),
    ...NOYAU.sanitaires.portes,
    {
      x: NOYAU.sanitaires.passage[0],
      y: NOYAU.sanitaires.passage[1],
      l: NOYAU.sanitaires.passage[2] - NOYAU.sanitaires.passage[0],
      axe: "h",
    },
  ];
  return [
    [x1, y1, x2, y1],
    [x2, y1, x2, y2],
    [x1, y2, x2, y2],
    [x1, y1, x1, y2],
    ...NOYAU.murs,
  ].flatMap((m) => percer(m, ouvertures));
}

export const dessertes = () =>
  Object.fromEntries(NOYAU.ascenseurs.map((a) => [a.id, [...a.dessert]]));

// choix : id de niveau ou "ville". visible : groupe affiché ; ouvert : façade sud abaissée à l'allège.
export function etatCoupe(choix) {
  const k = choix === "ville" ? NIVEAUX.length - 1 : indice(choix);
  if (k < 0) throw new Error(`niveau inconnu : ${choix}`);
  return Object.fromEntries(
    NIVEAUX.map((n, i) => [
      n.id,
      { visible: i <= k, ouvert: choix !== "ville" && i === k },
    ]),
  );
}

// Altitude au-dessus de laquelle rien ne s'affiche pour un choix de coupe.
export const plafondCoupe = (choix) => {
  if (choix === "ville") return Infinity;
  const n = NIVEAUX[indice(choix)];
  return n.z + n.h - EPS;
};
