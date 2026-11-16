// Plan du penthouse de Théo (coordonnées locales de l'étage) et chiffres du mur d'écrans, sans three.js.
export const CONTOUR = [
  [2, -10],
  [15, -10],
  [21, -4],
  [21, 4],
  [2, 4],
];
export const INTERIEUR = [
  [2, -10],
  [15, -10],
  [16, -9],
  [16, 4],
  [2, 4],
];
export const TERRASSE = [
  [16, -9],
  [21, -4],
  [21, 4],
  [16, 4],
];
export const ARRIVEE = { x: 3.9, z: 2 };
export const THEO = { x: 9, z: -7.95, angle: 0 };
export const PAUSES = [
  { x: 11.6, z: 2.9, angle: Math.PI },
  { x: 13.75, z: 0, angle: Math.PI / 2, debout: true },
  { x: 4.6, z: -9.35, angle: Math.PI, debout: true },
  { x: 14.6, z: -8.6, angle: (3 * Math.PI) / 4, debout: true },
  { x: 18.2, z: 2.1, angle: Math.PI },
  { x: 20.3, z: -2.6, angle: Math.PI / 2, debout: true },
];

// Murs et garde-corps [x0, z0, x1, z1, portes le long du mur].
export const MURS = [
  [2, -10, 2, 4],
  [2, -10, 15, -10],
  [15, -10, 16, -9],
  [16, -9, 16, 4, [[1.6, 2.8]]],
  [16, -9, 21, -4],
  [21, -4, 21, 4],
  [2, 4, 21, 4],
];

// Emprises au sol [x, z, largeur, profondeur, marge].
export const OBSTACLES = {
  ascenseur: [2.7, 2, 1.4, 2.2, 0.1],
  vitrine: [4.8, 3.6, 2.2, 0.5, 0.1],
  platine: [7.2, 3.6, 1.4, 0.6, 0.1],
  murEcrans: [9, -9.3, 5.2, 0.3, 0.12],
  bureau: [9, -7, 3.2, 1.1, 0.12],
  visiteurs: [9, -5.9, 1.6, 0.5, 0.05],
  canape: [11.2, 3.05, 2.8, 0.85, 0.1],
  canapeCote: [9.45, 1.55, 0.85, 1.8, 0.1],
  canapeAngle: [9.45, 3.05, 0.85, 0.85, 0.1],
  tableBasse: [11.2, 1.4, 1.4, 0.8, 0.1],
  comptoir: [14.6, 0, 0.6, 3, 0.1],
  etagere: [15.7, 0, 0.4, 3.2, 0.05],
  aquarium: [14.4, -4.4, 2.8, 0.5, 0.1],
  jacuzzi: [18.6, -1.6, 2.3, 2.3, 0.1],
  transat1: [18.2, 2.3, 0.7, 1.8, 0.05],
  transat2: [19.8, 2.3, 0.7, 1.8, 0.05],
  plante1: [2.7, -9.3, 0.6, 0.6, 0.15],
  plante2: [13.1, 3.4, 0.55, 0.55, 0.15],
  plante3: [2.6, -0.3, 0.55, 0.55, 0.15],
};

export function implanter(grille) {
  for (const [x0, z0, x1, z1, portes = []] of MURS) {
    const long = Math.hypot(x1 - x0, z1 - z0);
    const [dx, dz] = [(x1 - x0) / long, (z1 - z0) / long];
    const bornes = [0, ...portes.flat(), long];
    for (let k = 0; k < bornes.length; k += 2) {
      const [a, b] = [bornes[k], bornes[k + 1]];
      grille.segment(x0 + dx * a, z0 + dz * a, x0 + dx * b, z0 + dz * b, 0.25);
    }
  }
  for (const [x, z, l, p, m] of Object.values(OBSTACLES))
    grille.bloquer(x, z, l, p, m);
  grille.masque(CONTOUR);
}

const nombre = (v) => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);
const pourcent = (v) =>
  Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : null;
const deux = (n) => String(n).padStart(2, "0");

// Ce qu'affiche le mur d'écrans ; cle change seulement si l'affichage change.
export function panneaux(d = {}) {
  const agents = nombre(d.agentsActifs);
  const trancher = nombre(d.aTrancher);
  const c = d.chantiers ?? {};
  const h = d.heure instanceof Date ? d.heure : null;
  const limite = d.limite
    ? [
        ["5 heures", pourcent(d.limite.cinqHeures)],
        ["Semaine", pourcent(d.limite.semaine)],
      ].filter(([, v]) => v != null)
    : [];
  const liste = [
    {
      titre: "Agents au travail",
      valeur: String(agents),
      sous: agents ? "en ce moment" : "tout le monde se repose",
    },
    {
      titre: "À trancher",
      valeur: String(trancher),
      sous: trancher ? "attend ta décision" : "rien en attente",
      alerte: trancher > 0,
    },
    {
      titre: "Chantiers",
      valeur: String(nombre(c.enCours)),
      sous: `en cours · ${nombre(c.aFaire)} à faire · ${nombre(c.fait)} faits`,
    },
    {
      titre: "Limite",
      jauges: limite,
      sous: limite.length ? "" : "inconnue",
    },
  ];
  const bandeau = `THÉO · FONDATEUR${h ? `   ${deux(h.getHours())}:${deux(h.getMinutes())}` : ""}`;
  return { liste, bandeau, cle: JSON.stringify([liste, bandeau]) };
}
