import * as THREE from "three";
import {
  MAT,
  boite,
  chaise,
  etiquette,
  mur,
  plante,
  poste,
  sol,
  tableReunion,
} from "./meubles.js";

export const COULEURS = {
  ceo: "#f5c542",
  argent: "#e0b84a",
  operations: "#ff9f43",
  produit: "#9c6bff",
  tech: "#3d8bfd",
  marketing: "#ff5d8f",
  board: "#e5484d",
  renforts: "#8892a6",
};

export const LIMITES = [-40, 40, -28, 28];
const V = (x, z) => new THREE.Vector3(x, 0, z);

// Open spaces : [x0, x1, z0, z1] ; salles de réunion : [x0, x1, bande nord ou sud].
const OPEN = {
  tech: [-38, -12, -16, -3],
  argent: [12, 38, -16, -3],
  produit: [-38, -12, 6, 17],
  marketing: [12, 38, 6, 17],
  operations: [-10, 10, 8, 17],
};
const SALLES = {
  tech: [-6, 4, "nord"],
  argent: [4, 14, "nord"],
  produit: [-40, -30, "sud"],
  operations: [-30, -20, "sud"],
  marketing: [6, 16, "sud"],
};

function titre(scene, texte, couleur, x, z, y = 3.4, classe = "zone piece") {
  const e = etiquette(texte, couleur, classe);
  e.position.set(x, y, z);
  scene.add(e);
}

function bureauFerme(scene, grille, x0, x1, nom, couleur) {
  const cx = (x0 + x1) / 2;
  sol(scene, x0, x1, -28, -19, MAT.parquet);
  titre(scene, nom, couleur, cx, -24);
  const p = poste(scene, grille, cx - 1, -24.5, Math.PI, couleur, false);
  chaise(scene, "#3a2b24", cx - 1, -22.9, 0);
  const canape = boite(scene, 2.4, 0.45, 0.9, MAT.cuir, x1 - 0.8, 0.25, -24);
  canape.rotation.y = Math.PI / 2;
  grille.bloquer(x1 - 0.8, -24, 0.9, 2.4);
  plante(scene, grille, x0 + 0.8, -20, 1.2);
  return p;
}

function salle(scene, grille, x0, x1, nord, nom, couleur, places) {
  const cx = (x0 + x1) / 2;
  const cz = nord ? -23.5 : 23.5;
  sol(scene, x0, x1, nord ? -28 : 19, nord ? -19 : 28, MAT.parquet);
  titre(scene, nom, couleur, cx, cz);
  const l = Math.min(x1 - x0 - 3, 1.3 * Math.ceil(places / 2));
  return tableReunion(scene, grille, cx, cz, l, places, couleur, {
    x: x0 + 0.12,
    z: cz,
    angle: Math.PI / 2,
  });
}

function openSpace(scene, grille, id, nom, equipe) {
  const [x0, x1, z0] = OPEN[id];
  const c = COULEURS[id];
  const cx = (x0 + x1) / 2;
  const n = equipe.length + 3;
  const pods = Math.ceil(n / 6);
  titre(scene, nom, c, cx, z0 - 0.4, 4.4, "zone");
  const chef = poste(scene, grille, cx, z0 + 1.6, Math.PI, c, false);
  const postes = [];
  for (let k = 0; k < pods * 6; k++) {
    const pod = Math.floor(k / 6);
    const r = k % 6;
    const x = cx + ((r % 3) - 1) * 2.3;
    const zp = z0 + 5 + pod * 4.6;
    postes.push(
      poste(scene, grille, x, r < 3 ? zp : zp + 1.05, r < 3 ? Math.PI : 0, c),
    );
  }
  plante(scene, grille, x0 + 0.8, z0 + 0.8);
  plante(scene, grille, x1 - 0.8, z0 + 0.8);
  return { chef, postes };
}

function exterieur(scene) {
  const sol = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: "#3b3f46" }),
  );
  sol.rotation.x = -Math.PI / 2;
  sol.position.y = -8;
  scene.add(sol);
  const fenetres = new THREE.MeshStandardMaterial({
    color: "#2b3a4f",
    emissive: "#ffd28a",
    emissiveIntensity: 0.15,
    roughness: 0.3,
  });
  for (let k = 0; k < 70; k++) {
    const a = (k / 70) * Math.PI * 2 + Math.random() * 0.05;
    const d = 70 + Math.random() * 60;
    const h = 15 + Math.random() * 55;
    boite(
      scene,
      8 + Math.random() * 10,
      h,
      8 + Math.random() * 10,
      k % 3 ? fenetres : MAT.beton,
      Math.cos(a) * d,
      h / 2 - 8,
      Math.sin(a) * d,
    );
  }
}

export function plan(scene, grille, org) {
  const [X0, X1, Z0, Z1] = LIMITES;
  exterieur(scene);
  boite(scene, X1 - X0 + 1, 8, Z1 - Z0 + 1, MAT.beton, 0, -4.02, 0);
  sol(scene, X0, X1, Z0, Z1, MAT.moquette);
  mur(scene, grille, X0, Z0, X1, Z0, { type: "fenetre" });
  mur(scene, grille, X0, Z1, X1, Z1, { type: "fenetre" });
  mur(scene, grille, X0, Z0, X0, Z1, { type: "fenetre" });
  mur(scene, grille, X1, Z0, X1, Z1, { type: "fenetre" });

  // Bande nord : bureaux, board, salles Tech et Argent, cabinet de l'avocat, cuisine
  const nord = [-40, -30, -22, -6, 4, 14, 22, 40];
  for (let k = 1; k < nord.length - 1; k++)
    mur(scene, grille, nord[k], -28, nord[k], -19, {
      type: k === 1 || k === 5 ? "plein" : "verre",
    });
  for (let k = 0; k < nord.length - 1; k++) {
    const a = nord[k + 1] - nord[k];
    mur(scene, grille, nord[k], -19, nord[k + 1], -19, {
      portes: [k === 6 ? [2, a - 2] : [a - 2.2, a - 0.8]],
    });
  }
  // Bande sud : salles Produit, Opérations, Marketing (le reste est ouvert : renforts, accueil, salon)
  for (const [a, b] of [
    [-40, -20],
    [6, 16],
  ]) {
    mur(scene, grille, a, 19, b, 19, {
      portes:
        a < 0
          ? [
              [7.8, 9.2],
              [17.8, 19.2],
            ]
          : [[8, 9.4]],
    });
    if (a > X0) mur(scene, grille, a, 19, a, 28);
    mur(scene, grille, b, 19, b, 28);
  }
  mur(scene, grille, -30, 19, -30, 28);

  // Noyau : ascenseurs et sanitaires
  boite(scene, 12, 3, 10, MAT.platre, 0, 1.5, -1);
  grille.bloquer(0, -1, 12, 10);
  for (const x of [-3.4, -1.1, 1.2, 3.5])
    boite(scene, 1.5, 2.3, 0.08, MAT.alu, x, 1.15, 4.02);
  sol(scene, -8, 8, 4, 7, MAT.carrelage);
  titre(scene, "Ascenseurs", "#b9c0c8", 0, 4.5, 3.6);

  const ceo = bureauFerme(scene, grille, -40, -30, "CEO", COULEURS.ceo);
  const theo = bureauFerme(scene, grille, -30, -22, "Théo", "#ffffff");
  const avocat = bureauFerme(scene, grille, 14, 22, "Avocat", COULEURS.board);
  sol(scene, -22, -6, -28, -19, MAT.parquet);
  titre(scene, "Board", COULEURS.board, -14, -23.5);
  const board = tableReunion(scene, grille, -14, -23.5, 9, 10, COULEURS.board, {
    x: -21.88,
    z: -23.5,
    angle: Math.PI / 2,
  });

  // Cuisine
  sol(scene, 22, 40, -28, -19, MAT.carrelage);
  titre(scene, "Cuisine", "#c9a27a", 31, -23.5);
  boite(scene, 12, 0.95, 0.75, MAT.blanc, 31, 0.48, -27.2);
  grille.bloquer(31, -27.2, 12, 0.75);
  boite(scene, 0.5, 0.6, 0.45, MAT.noir, 27, 1.25, -27.2);
  boite(scene, 0.9, 2.1, 0.75, MAT.alu, 37.5, 1.05, -27.2);
  boite(scene, 4, 1.05, 1.1, MAT.bois, 31, 0.53, -23);
  grille.bloquer(31, -23, 4, 1.1);
  for (const x of [29.6, 31, 32.4]) chaise(scene, "#2f3542", x, -21.9, 0);

  // Salon, accueil et renforts au sud
  sol(scene, -6, 6, 19, 28, MAT.carrelage);
  titre(scene, "Accueil", "#b9c0c8", 0, 24);
  boite(scene, 5, 1.1, 0.9, MAT.bois, 0, 0.55, 21.5);
  grille.bloquer(0, 21.5, 5, 0.9);
  boite(scene, 3.2, 0.45, 1, MAT.cuir, 0, 0.25, 27);
  grille.bloquer(0, 27, 3.2, 1);
  titre(scene, "Salon", "#9fd3ff", 28, 23.5);
  for (const [x, z, r] of [
    [22, 26.8, 0],
    [30, 26.8, 0],
    [34, 22, Math.PI / 2],
  ]) {
    const s = boite(scene, 3.4, 0.5, 1.1, MAT.tissu, x, 0.25, z);
    s.rotation.y = r;
    grille.bloquer(x, z, r ? 1.1 : 3.4, r ? 3.4 : 1.1);
  }
  boite(scene, 2.7, 0.06, 1.5, MAT.table, 26, 0.76, 22.5);
  boite(scene, 0.03, 0.15, 1.5, MAT.blanc, 26, 0.86, 22.5);
  grille.bloquer(26, 22.5, 2.7, 1.5);
  for (const [x, z] of [
    [17, 20],
    [39, 20],
    [-7, 27],
    [7, 27],
    [-39, -18],
    [39, -18],
  ])
    plante(scene, grille, x, z, 1.3);

  const services = {};
  for (const c of org.chefs.filter((x) => OPEN[x.id])) {
    const nom = c.nom.replace(/ \(.*\)/, "");
    const s = openSpace(scene, grille, c.id, nom, c.equipe);
    const [x0, x1, cote] = SALLES[c.id];
    s.salle = salle(
      scene,
      grille,
      x0,
      x1,
      cote === "nord",
      `Réunion ${nom.split(" ")[0]}`,
      COULEURS[c.id],
      8,
    );
    services[c.id] = s;
  }
  titre(scene, "Renforts", COULEURS.renforts, -13, 21);
  const renforts = [-17, -13, -9].flatMap((x) => [
    poste(scene, grille, x, 23, 0, COULEURS.renforts, false),
    poste(scene, grille, x, 26.2, Math.PI, COULEURS.renforts, false),
  ]);

  const pauses = [
    V(27, -25.8),
    V(29, -25.8),
    V(31, -24.4),
    V(33, -21.5),
    V(24, 23),
    V(28, 23.6),
    V(29, 25.6),
    V(-36, -17.5),
    V(36, -17.4),
    V(-39, 2),
    V(39, -1),
    V(-8, 5.6),
    V(8, 5.2),
    V(-2, 18),
  ];
  const invite = { place: V(0, 26.3), angle: Math.PI };
  return {
    ceo,
    theo,
    avocat,
    board,
    services,
    renforts,
    pauses,
    invite,
    ascenseur: V(0, 5),
  };
}
