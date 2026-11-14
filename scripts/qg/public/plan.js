import * as THREE from "three";
import {
  MAT,
  boite,
  chaise,
  cylindre,
  etiquette,
  mur,
  plante,
  poste,
  sol,
  tableReunion,
} from "./meubles.js";
import {
  ZIK,
  affiche,
  canape,
  credence,
  jukebox,
  murVinyles,
  neonZik,
  tapis,
} from "./deco.js";

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

export const LIMITES = [-17, 17, -11, 11];
const V = (x, z) => new THREE.Vector3(x, 0, z);
const NORD = -6.5;
const SUD = 6.5;

// Quartiers de l'open space : [x centre, colonnes] ; salles de réunion : [x0, x1, nord ?].
const QUARTIERS = {
  tech: [-13, 4],
  produit: [-6.1, 3],
  operations: [0, 3],
  marketing: [6.1, 3],
  argent: [13, 2],
};
const SALLES = {
  tech: [-2.5, 1.5, true],
  produit: [1.5, 5.5, true],
  argent: [-17, -13, false],
  marketing: [-13, -9, false],
  operations: [-9, -5, false],
};

function titre(scene, texte, couleur, x, z, y = 3, classe = "zone piece") {
  const e = etiquette(texte, couleur, classe);
  e.position.set(x, y, z);
  scene.add(e);
}

function bureau(scene, grille, x0, x1, nom, couleur) {
  const cx = (x0 + x1) / 2;
  sol(scene, x0, x1, -11, NORD, MAT.parquet);
  titre(scene, nom, couleur, cx, -8.8);
  const p = poste(scene, grille, cx - 0.4, -9.3, Math.PI, couleur, false);
  chaise(scene, "#3b2a22", cx - 0.4, -8, 0);
  credence(scene, grille, cx, -10.7, Math.PI, x1 - x0 - 1);
  plante(scene, grille, x0 + 0.5, NORD - 0.5, 1.3, true);
  return p;
}

function salle(scene, grille, id, nom) {
  const [x0, x1, nord] = SALLES[id];
  const cx = (x0 + x1) / 2;
  const cz = nord ? -8.75 : 8.75;
  sol(scene, x0, x1, nord ? -11 : SUD, nord ? NORD : 11, MAT.moquette);
  titre(scene, `Réunion ${nom}`, COULEURS[id], cx, cz);
  plante(scene, grille, x1 - 0.4, nord ? -10.6 : 10.6, 0.9);
  return tableReunion(scene, grille, cx + 0.35, cz, 2.4, 6, COULEURS[id], {
    x: x0 + 0.06,
    z: cz,
    angle: Math.PI / 2,
  });
}

function quartier(scene, grille, id, nom, equipe) {
  const [cx, cols] = QUARTIERS[id];
  const c = COULEURS[id];
  titre(scene, nom, c, cx, -4.6, 3.6, "zone");
  tapis(scene, cx, -0.2, cols * 1.6 + 1.2, 8.6, c, 0.12);
  const chef = poste(scene, grille, cx, -3.3, Math.PI, c, false);
  const postes = [];
  for (let r = 0; r < 2; r++)
    for (let k = 0; k < cols; k++)
      postes.push(
        poste(
          scene,
          grille,
          cx + (k - (cols - 1) / 2) * 1.6,
          r ? 1.45 : 0.6,
          r ? 0 : Math.PI,
          c,
        ),
      );
  boite(scene, 1.4, 0.9, 0.05, MAT.blanc, cx - 0.6, 1.2, 3.9).rotation.y = 0;
  grille.bloquer(cx - 0.6, 3.9, 1.4, 0.1);
  plante(scene, grille, cx + 1.2, 3.9, 1.1, true);
  return { chef, postes, extra: postes.slice(equipe.length) };
}

export function plan(scene, grille, org) {
  const [X0, X1, Z0, Z1] = LIMITES;
  boite(scene, X1 - X0 + 0.6, 0.4, Z1 - Z0 + 0.6, MAT.sombre, 0, -0.2, 0);
  sol(scene, X0, X1, Z0, Z1, MAT.beton);
  mur(scene, grille, X0, Z0, X1, Z0, { type: "fenetre" });
  mur(scene, grille, X0, Z0, X0, Z1, { type: "fenetre" });
  mur(scene, grille, X1, Z0, X1, SUD, { type: "fenetre" });
  mur(scene, grille, X1, SUD, X1, Z1, { type: "plein" });
  mur(scene, grille, X0, Z1, -5, Z1, { type: "fenetre" });
  mur(scene, grille, -5, Z1, 3, Z1, { type: "plein" });
  mur(scene, grille, 3, Z1, X1, Z1, { type: "fenetre" });

  // Bande nord : bureaux, board, salles, avocat, cuisine
  const nord = [-17, -13, -9.5, -2.5, 1.5, 5.5, 8.5, 17];
  for (let k = 1; k < nord.length - 1; k++)
    mur(scene, grille, nord[k], Z0, nord[k], NORD, {
      type: k === 1 ? "plein" : "verre",
    });
  for (let k = 0; k < nord.length - 1; k++) {
    const a = nord[k + 1] - nord[k];
    mur(scene, grille, nord[k], NORD, nord[k + 1], NORD, {
      portes: [k === 6 ? [1.5, a - 1.5] : [a - 1.5, a - 0.4]],
    });
  }
  // Bande sud : trois salles de réunion, puis accueil, renforts et salon ouverts
  for (let k = 0; k < 3; k++)
    mur(scene, grille, -17 + k * 4, SUD, -13 + k * 4, SUD, {
      portes: [[2.9, 3.9]],
    });
  mur(scene, grille, -13, SUD, -13, Z1);
  mur(scene, grille, -9, SUD, -9, Z1);
  mur(scene, grille, -5, SUD, -5, Z1, { type: "plein" });
  for (const z of [7.6, 9.4])
    boite(scene, 0.04, 2.2, 1.2, MAT.alu, -4.93, 1.1, z);
  titre(scene, "Ascenseurs", "#c3c8cf", -4.4, 8.5, 2.8);

  const ceo = bureau(scene, grille, -17, -13, "Claire · CEO", COULEURS.ceo);
  const theo = bureau(scene, grille, -13, -9.5, "Théo", "#ffffff");
  const avocat = bureau(
    scene,
    grille,
    5.5,
    8.5,
    "Victor · avocat",
    COULEURS.board,
  );
  affiche(scene, -13.06, 1.6, -8.8, -Math.PI / 2, 0);
  affiche(scene, -12.94, 1.6, -8.8, Math.PI / 2, 1);
  sol(scene, -9.5, -2.5, Z0, NORD, MAT.parquet);
  titre(scene, "Board", COULEURS.board, -6, -8.75);
  const board = tableReunion(scene, grille, -5.7, -8.75, 4.6, 8, ZIK.magenta, {
    x: -9.44,
    z: -8.75,
    angle: Math.PI / 2,
  });
  plante(scene, grille, -2.9, -10.6, 1.2, true);

  sol(scene, 8.5, 17, Z0, NORD, MAT.carrelage);
  titre(scene, "Cuisine", "#c49a6c", 12.7, -8.8);
  boite(scene, 7, 0.92, 0.65, MAT.blanc, 12.5, 0.46, -10.6);
  boite(scene, 7, 0.04, 0.67, MAT.chene, 12.5, 0.94, -10.6);
  grille.bloquer(12.5, -10.6, 7, 0.65, 0.15);
  boite(scene, 0.4, 0.45, 0.35, MAT.noir, 10, 1.18, -10.6);
  boite(scene, 0.8, 2, 0.65, MAT.alu, 16.4, 1, -10.6);
  cylindre(
    scene,
    0.15,
    0.08,
    new THREE.MeshStandardMaterial({ color: "#f59e0b" }),
    13,
    0.98,
    -10.6,
  );
  boite(scene, 2.6, 0.95, 0.9, MAT.chene, 12.5, 0.48, -8.5);
  grille.bloquer(12.5, -8.5, 2.6, 0.9, 0.15);
  for (const x of [11.6, 12.5, 13.4])
    cylindre(scene, 0.18, 0.75, MAT.noir, x, 0.38, -7.75, 12);
  plante(scene, grille, 9, -7, 1.2, true);

  const services = {};
  for (const c of org.chefs.filter((x) => QUARTIERS[x.id])) {
    const nom = c.nom.replace(/ \(.*\)/, "");
    services[c.id] = quartier(scene, grille, c.id, nom, c.equipe);
    services[c.id].salle = salle(scene, grille, c.id, nom.split(" ")[0]);
  }

  // Accueil, renforts, salon
  sol(scene, -5, 3, SUD, Z1, MAT.parquet);
  neonZik(scene, -1, 10.88, Math.PI, 4.4);
  boite(scene, 3.2, 1.05, 0.7, MAT.blanc, -1, 0.53, 8.4);
  boite(scene, 3.2, 0.06, 0.8, MAT.chene, -1, 1.08, 8.4);
  grille.bloquer(-1, 8.4, 3.2, 0.7, 0.15);
  const invite = canape(scene, grille, 2, 10.2, 0, MAT.cuir, 1.8);
  titre(scene, "Renforts", COULEURS.renforts, 5.5, 7.2);
  const renforts = [4.3, 6.7].flatMap((x) => [
    poste(scene, grille, x, 8.2, Math.PI, COULEURS.renforts),
    poste(scene, grille, x, 9.05, 0, COULEURS.renforts),
  ]);
  titre(scene, "Salon", ZIK.neon, 12.5, 8.8);
  tapis(scene, 12.5, 8.8, 5, 3.4, "#3b0d43");
  canape(scene, grille, 12.5, 10.4, 0);
  canape(scene, grille, 10.2, 8.8, -Math.PI / 2);
  boite(scene, 1.4, 0.35, 0.8, MAT.chene, 12.5, 0.18, 8.8);
  grille.bloquer(12.5, 8.8, 1.4, 0.8, 0.1);
  jukebox(scene, grille, 16.4, 7.4, -Math.PI / 2);
  murVinyles(scene, 16.94, 9.3, -Math.PI / 2);
  plante(scene, grille, 9, 10.5, 1.3, true);
  plante(scene, grille, 16.4, 10.5, 1.2, true);
  for (const [x, z, a] of [
    [-16.7, -2, Math.PI / 2],
    [-16.7, 3, Math.PI / 2],
    [16.7, -2, -Math.PI / 2],
    [16.7, 3, -Math.PI / 2],
  ])
    credence(scene, grille, x, z, a, 2.2);
  affiche(scene, -5.06, 1.6, 8.5, -Math.PI / 2, 2);

  const pauses = [
    V(10.5, -9.8),
    V(12, -9.8),
    V(14, -9.8),
    V(12.5, -7.3),
    V(13.6, -7.4),
    V(12, 7.6),
    V(13.5, 7.6),
    V(15.6, 8.2),
    V(-16.2, -5.5),
    V(15.6, 0.5),
    V(-3, 5.6),
    V(4, 5.6),
    V(-9.5, -5.8),
    V(9, -5.8),
  ];
  return {
    ceo,
    theo,
    avocat,
    board,
    services,
    renforts,
    pauses,
    invite,
    ascenseur: V(-4.3, 8.5),
  };
}
