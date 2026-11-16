import * as THREE from "three";
import {
  MAT,
  boite,
  chaise,
  cylindre,
  ecran,
  mur,
  plante,
  poste,
  sol,
  solForme,
  titre,
} from "./meubles.js";
import { ZIK, canape, tapis } from "./deco.js";
import { fauteuil, tableCafe, tableReunion } from "./pieces.js";
import { ascenseurs } from "./noyau.js";
import { COULEURS, FRONT, contreFacade, facade } from "./batiment.js";
import { NOMS } from "./disposition.js";
import { bureau } from "./salles.js";

const CHEFS = [
  ["tech", "Karim"],
  ["produit", "Julien"],
  ["marketing", "Inès"],
  ["operations", "Sophie"],
  ["argent", "Marc"],
];
const debout = (x, z, angle) => ({
  place: new THREE.Vector3(x, 0, z),
  angle,
  debout: true,
});

// Emprise de l'étage : plus petite que le Plateau, la façade nord garde son biais.
export const contourDirection = [
  [-12, facade(-12)],
  [8, -10],
  [15, -10],
  [21, -4],
  [21, 6],
  [-12, 6],
];

const plaque = (g, x, z, angle = 0) => {
  boite(g, 0.5, 0.16, 0.03, MAT.or, x, 1.55, z).rotation.y = angle;
};

// Bureau d'angle de la CEO : le plus grand, vitré, salon et grand écran.
function bureauCeo(g, grille) {
  solForme(g, contreFacade(12, 21, -0.5), MAT.parquet);
  mur(g, grille, 12, -10, 12, -0.5);
  mur(g, grille, 12, -0.5, 21, -0.5, { portes: [[0.6, 1.8]], sens: 1 });
  plaque(g, 14.2, -0.42);
  titre(g, "Bureau de Claire", COULEURS.ceo, 16.5, -2.6, "CEO");
  tapis(g, 16.6, -5.6, 4.4, 3.4, "#4a3728");
  const p = poste(g, grille, 16.6, -5.8, Math.PI, COULEURS.ceo, false);
  for (const dx of [-0.45, 0.45]) chaise(g, "#3b2a22", 16.6 + dx, -4.7, 0);
  grille.bloquer(16.6, -4.7, 1.4, 0.5, 0.05);
  const e = ecran(COULEURS.ceo, 1.6, 0.9);
  e.material.emissiveIntensity = 0.5;
  e.position.set(12.1, 1.5, -5.5);
  e.rotation.y = Math.PI / 2;
  g.add(e);
  canape(g, grille, 20.2, -2, -Math.PI / 2, MAT.cuir, 2);
  boite(g, 0.7, 0.35, 1, MAT.chene, 19, 0.18, -2);
  grille.bloquer(19, -2, 0.7, 1, 0.1);
  plante(g, grille, 12.7, -1.2, 1.2, true);
  plante(g, grille, 13, -9.2, 1.2, true);
  return p;
}

// Salle du board, vitrée côté couloir, télé sur le mur plein.
function salleBoard(g, grille) {
  sol(g, 6, 15, 1.5, 6, MAT.parquet, 0.015);
  mur(g, grille, 6, 1.5, 15, 1.5, { portes: [[0.5, 1.7]], sens: 1 });
  mur(g, grille, 6, 1.5, 6, 6, { type: "plein" });
  mur(g, grille, 15, 1.5, 15, 6);
  titre(g, "Le Disque d'Or", COULEURS.board, 10.8, 3.8, "salle du board");
  const board = tableReunion(
    g,
    grille,
    10.8,
    3.8,
    4.2,
    8,
    ZIK.magenta,
    { x: 6.1, z: 3.8, angle: Math.PI / 2 },
    "Le Disque d'Or",
  );
  const disque = cylindre(g, 0.38, 0.03, MAT.or, 6.1, 1.6, 5.4, 32);
  disque.rotation.z = Math.PI / 2;
  return board;
}

// Bureau de Victor, au sud-est, à côté du board.
function bureauAvocat(g, grille) {
  sol(g, 15, 21, 1.5, 6, MAT.parquet, 0.015);
  mur(g, grille, 15, 1.5, 21, 1.5, { portes: [[0.4, 1.6]], sens: 1 });
  plaque(g, 17.9, 1.42);
  titre(g, "Bureau de Victor", COULEURS.board, 18, 2.4, "avocat");
  const p = poste(g, grille, 18.2, 3.9, 0, COULEURS.board, false);
  for (const dx of [-0.45, 0.45])
    chaise(g, "#3b2a22", 18.2 + dx, 2.75, Math.PI);
  grille.bloquer(18.2, 2.75, 1.4, 0.5, 0.05);
  plante(g, grille, 20.4, 5.3, 1.1, true);
  return p;
}

// Le comptoir de Gérard : bar, bouteilles, table haute.
function comptoir(g, grille) {
  sol(g, -12, -6, 1.5, 6, MAT.parquet, 0.015);
  titre(g, "Le Comptoir", "#78350f", -9, 2.6, "coin de Gérard");
  boite(g, 3.2, 1.05, 0.6, MAT.bois, -9.4, 0.53, 5.2);
  boite(g, 3.3, 0.05, 0.7, MAT.noir, -9.4, 1.08, 5.2);
  grille.bloquer(-9.4, 5.2, 3.2, 0.6, 0.1);
  ["#3DDC84", "#F4E04D", "#c026d3", "#5BC0EB"].forEach((c, k) =>
    cylindre(
      g,
      0.05,
      0.3,
      new THREE.MeshStandardMaterial({ color: c, emissive: c }),
      -10.6 + k * 0.5,
      1.25,
      5.3,
      8,
    ),
  );
  return tableCafe(g, grille, -9, 3.6, COULEURS.board);
}

// Accueil de la direction face aux ascenseurs, et salon d'attente.
function accueil(g, grille) {
  titre(g, "Direction", ZIK.or, 3.4, 4.9, "accueil");
  boite(g, 2.4, 1.1, 0.5, MAT.blanc, 3.4, 0.55, 3.2);
  boite(g, 2.5, 0.05, 0.62, MAT.chene, 3.4, 1.12, 3.18);
  grille.bloquer(3.4, 3.4, 2.6, 1.2, 0.1);
  chaise(g, ZIK.or, 3.4, 4.1, 0);
  plante(g, grille, 5.4, 5.4, 1.2, true);
  return [
    fauteuil(g, grille, -4.2, 4.8, 0, "#4a3728"),
    fauteuil(g, grille, -2.6, 4.8, 0, "#4a3728"),
  ];
}

// Étage de la Direction : bureaux vitrés des chefs, board, avocat, client pro.
export function direction(g, grille) {
  const forme = contourDirection;
  grille.masque(forme);
  const dalle = solForme(g, forme, MAT.sombre, -0.3);
  dalle.material.side = THREE.DoubleSide;
  solForme(g, forme, MAT.moquette, 0).material.color.set("#3a3340");
  for (let k = 0; k < forme.length; k++) {
    const [x0, z0] = forme[k];
    const [x1, z1] = forme[(k + 1) % forme.length];
    const h = z0 === 6 && z1 === 6 ? 1.2 : 2.6;
    mur(g, grille, x0, z0, x1, z1, { type: "fenetre", h });
  }

  const chefs = {};
  const bords = [-12, -7.2, -2.4, 2.4, 7.2, 12];
  CHEFS.forEach(([id, prenom], k) => {
    const [a, b] = [bords[k], bords[k + 1]];
    if (k) mur(g, grille, a, FRONT, a, facade(a));
    mur(g, grille, a, FRONT, b, FRONT, {
      portes: [[b - a - 1.45, b - a - 0.25]],
    });
    chefs[id] = bureau(
      g,
      grille,
      a,
      b,
      `${prenom} · ${NOMS[id]}`,
      COULEURS[id],
    );
    plaque(g, b - 1.75, FRONT + 0.08);
  });

  const ceo = bureauCeo(g, grille);
  const board = salleBoard(g, grille);
  const avocat = bureauAvocat(g, grille);
  const invites = comptoir(g, grille);
  const salon = accueil(g, grille);

  ascenseurs(g, -0.5, 0.7, 3, 2.6);
  grille.bloquer(-0.5, 0.7, 3, 2.6, 0.2);
  titre(g, "Ascenseurs", "#c3c8cf", -0.5, 2.4, "", 2.7);

  for (const [x, z] of [
    [-6, -1],
    [4, -1],
    [10.5, 3.8],
    [17, -5],
  ]) {
    const l = new THREE.PointLight("#ffc98a", 10, 14, 2);
    l.position.set(x, 2.4, z);
    g.add(l);
  }

  return {
    contour: forme,
    ceo,
    chefs,
    board,
    avocat,
    invites,
    pauses: [...salon, debout(-6, 0.5, Math.PI), debout(20, 0, -Math.PI / 2)],
    ascenseur: debout(-0.5, 2.6, 0),
  };
}
