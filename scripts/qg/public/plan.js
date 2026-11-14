import * as THREE from "three";
import { MAT, etiquette, mur, poste, sol, solForme } from "./meubles.js";
import { ZIK, affiche, neonZik, tapis } from "./deco.js";
import {
  ascenseurs,
  cabine,
  escalier,
  sanitaires,
  tableReunion,
} from "./pieces.js";
import { bureau, espaces } from "./espaces.js";

export const COULEURS = {
  ceo: ZIK.or,
  argent: "#F4E04D",
  operations: "#FF8C42",
  produit: "#8C7BFF",
  tech: "#5BC0EB",
  marketing: "#FF4F9A",
  board: ZIK.magenta,
  renforts: "#94A3B8",
};

// Contour du plateau : façade nord en biais, angles coupés à l'est, décroché au sud-ouest.
export const CONTOUR = [
  [-20, -8],
  [8, -10],
  [15, -10],
  [21, -4],
  [21, 6],
  [16, 10],
  [-8, 10],
  [-8, 6],
  [-20, 6],
];
export const LIMITES = [-21, 22, -11, 11];
const V = (x, z) => new THREE.Vector3(x, 0, z);
const facade = (x) =>
  x <= 8 ? -8 - (x + 20) / 14 : x <= 15 ? -10 : -10 + (x - 15);
const FRONT = -4.5;

// Quartiers de l'open space : centre, rangée (z), colonnes, côté du bureau du chef.
const QUARTIERS = {
  tech: [-15.5, -1.5, 4, 1],
  produit: [-6.2, -1.5, 3, -1],
  argent: [-15.5, 3, 2, 1],
  operations: [8.4, -1.5, 3, 1],
  marketing: [8, 3, 2, 1],
};
// Salles de réunion : nom, x0, x1, z0, z1, mur de l'écran (x).
const SALLES = {
  tech: ["Abbey Road", -15, -9, null, FRONT],
  produit: ["Motown", -9, -2, null, FRONT],
  marketing: ["Woodstock", -8, -2, 6.5, 10],
  argent: ["Montreux", 17, 21, -3, 1],
  operations: ["La Cigale", 17, 21, 1, 5.5],
};

function titre(scene, texte, couleur, x, z, y = 2.9, classe = "zone piece") {
  const e = etiquette(texte, couleur, classe);
  e.position.set(x, y, z);
  scene.add(e);
}

function salle(scene, grille, id) {
  const [nom, x0, x1, z0, z1] = SALLES[id];
  const haut = z0 ?? Math.max(facade(x0), facade(x1));
  const cx = (x0 + x1) / 2;
  const cz = (haut + z1) / 2;
  solForme(
    scene,
    z0 == null
      ? [
          [x0, facade(x0)],
          [x1, facade(x1)],
          [x1, z1],
          [x0, z1],
        ]
      : [
          [x0, z0],
          [x1, z0],
          [x1, z1],
          [x0, z1],
        ],
    MAT.moquette,
  );
  titre(scene, nom, COULEURS[id], cx, cz);
  const largeur = x1 - x0;
  const r = tableReunion(
    scene,
    grille,
    cx + 0.3,
    cz,
    Math.min(2.6, largeur - 2.2),
    6,
    COULEURS[id],
    { x: x0 + 0.1, z: cz, angle: Math.PI / 2 },
  );
  affiche(scene, x1 - 0.08, 1.6, cz, -Math.PI / 2, id.length);
  return r;
}

function quartier(scene, grille, id, nom, equipe) {
  const [cx, z0, cols, cote] = QUARTIERS[id];
  const c = COULEURS[id];
  const l = cols * 1.6;
  titre(scene, nom, c, cx, z0 - 1.3, 3.2, "zone");
  tapis(scene, cx + (cote * 0.9) / 2, z0 + 0.42, l + 2.4, 3.7, c, 0.16);
  const postes = [];
  for (let r = 0; r < 2; r++)
    for (let k = 0; k < cols; k++)
      postes.push(
        poste(
          scene,
          grille,
          cx + (k - (cols - 1) / 2) * 1.6,
          r ? z0 + 0.85 : z0,
          r ? 0 : Math.PI,
          c,
        ),
      );
  const chef = poste(
    scene,
    grille,
    cx + cote * (l / 2 + 0.7),
    z0 + 0.42,
    cote > 0 ? -Math.PI / 2 : Math.PI / 2,
    c,
    false,
  );
  return { chef, postes, extra: postes.slice(equipe.length) };
}

export function plan(scene, grille, org) {
  grille.masque(CONTOUR);
  const dalle = solForme(scene, CONTOUR, MAT.sombre, -0.3);
  dalle.material.side = THREE.DoubleSide;
  solForme(scene, CONTOUR, MAT.beton, 0);
  for (let k = 0; k < CONTOUR.length; k++) {
    const [a, b] = [CONTOUR[k], CONTOUR[(k + 1) % CONTOUR.length]];
    mur(scene, grille, a[0], a[1], b[0], b[1], { type: "fenetre" });
  }

  // Bande nord : bureaux, salles, cabines, board
  for (const x of [-15, -9, -2, 1.5, 5, 12, 17.5])
    mur(scene, grille, x, FRONT, x, facade(x), {
      type: [-9, 1.5].includes(x) ? "verre" : "plein",
    });
  const fronts = [
    [-20, -15, "plein"],
    [-15, -9, "verre"],
    [-9, -2, "verre"],
    [-2, 1.5, "plein"],
    [1.5, 5, "verre"],
    [5, 12, "verre"],
    [12, 17.5, "plein"],
  ];
  for (const [a, b, type] of fronts)
    mur(scene, grille, a, FRONT, b, FRONT, {
      type,
      portes: [[b - a - 1.3, b - a - 0.3]],
    });
  const avocat = bureau(
    scene,
    grille,
    facade,
    -20,
    -15,
    "Bureau de Victor",
    COULEURS.board,
  );
  const theo = bureau(
    scene,
    grille,
    facade,
    -2,
    1.5,
    "Bureau de Théo",
    "#ffffff",
  );
  const ceo = bureau(
    scene,
    grille,
    facade,
    12,
    17.5,
    "Bureau de Claire",
    COULEURS.ceo,
    true,
  );
  solForme(
    scene,
    [
      [1.5, facade(1.5)],
      [5, facade(5)],
      [5, FRONT],
      [1.5, FRONT],
    ],
    MAT.moquette,
  );
  titre(scene, "Cabines", "#94A3B8", 3.2, -7.4);
  cabine(scene, grille, 2.3, -8.6, 0, "#5BC0EB");
  cabine(scene, grille, 3.6, -8.7, 0, "#3DDC84");
  solForme(
    scene,
    [
      [5, facade(5)],
      [8, -10],
      [12, -10],
      [12, FRONT],
      [5, FRONT],
    ],
    MAT.parquet,
  );
  titre(scene, "L'Olympia", COULEURS.board, 8.5, -7.3);
  const board = tableReunion(scene, grille, 8.8, -7.3, 4.2, 8, ZIK.magenta, {
    x: 5.1,
    z: -7.3,
    angle: Math.PI / 2,
  });
  affiche(scene, 11.92, 1.6, -7.3, -Math.PI / 2, 1);

  // Noyau : sanitaires, ascenseurs, escalier
  mur(scene, grille, -2, -3.2, 5, -3.2, { type: "plein" });
  mur(scene, grille, -2, -3.2, -2, 2, { type: "plein", portes: [[0.6, 1.5]] });
  mur(scene, grille, 1, -3.2, 1, 2, { type: "plein" });
  mur(scene, grille, 5, -3.2, 5, 2, { type: "plein" });
  mur(scene, grille, 1, 2, 5, 2, { type: "plein", portes: [[2.9, 3.8]] });
  mur(scene, grille, -2, -0.6, 1, -0.6, { type: "plein" });
  sol(scene, -2, 5, -3.2, 2, MAT.carrelage, 0.02);
  sanitaires(scene, -0.5, -1.9, 3);
  ascenseurs(scene, -0.5, 0.7, 3, 2.6);
  grille.bloquer(-0.5, 0.7, 3, 2.6, 0.2);
  escalier(scene, 3, -0.6, 3.8, 5);
  neonZik(scene, 2.4, 2.09, 0, 2.6);
  titre(scene, "Ascenseurs", "#c3c8cf", -0.5, 2.4, 2.7);
  titre(scene, "Escalier", "#c3c8cf", 3, -1.8, 2.7);
  titre(scene, "Sanitaires", "#c3c8cf", -0.5, -2, 2.7);

  // Salles de réunion des services et open space
  mur(scene, grille, -8, 6.5, -2, 6.5, { portes: [[4.6, 5.6]] });
  mur(scene, grille, -2, 6.5, -2, 10, { type: "plein" });
  mur(scene, grille, 17, -3, 21, -3, { type: "plein" });
  mur(scene, grille, 17, 1, 21, 1, { type: "plein" });
  mur(scene, grille, 17, 5.5, 21, 5.5, { type: "plein" });
  for (const [z0, z1] of [
    [-3, 1],
    [1, 5.5],
  ])
    mur(scene, grille, 17, z0, 17, z1, {
      portes: [[z1 - z0 - 1.2, z1 - z0 - 0.2]],
    });
  const services = {};
  for (const c of org.chefs.filter((x) => QUARTIERS[x.id])) {
    services[c.id] = quartier(
      scene,
      grille,
      c.id,
      c.nom.replace(/ \(.*\)/, ""),
      c.equipe,
    );
    services[c.id].salle = salle(scene, grille, c.id);
  }

  const { invite, renforts, pauses } = espaces(scene, grille);
  return {
    ceo,
    theo,
    avocat,
    board,
    services,
    renforts,
    pauses,
    invite,
    ascenseur: { place: V(-0.5, 2.6), angle: 0, debout: true },
  };
}
