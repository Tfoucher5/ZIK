import * as THREE from "three";
import {
  MAT,
  boite,
  chaise,
  etiquette,
  plante,
  poste,
  sol,
  solForme,
} from "./meubles.js";
import { ZIK, canape, credence, jukebox, murVinyles, tapis } from "./deco.js";
import {
  bibliotheque,
  casque,
  fauteuil,
  murVegetal,
  poufs,
  tableCafe,
} from "./pieces.js";

const V = (x, z) => new THREE.Vector3(x, 0, z);

function titre(scene, texte, couleur, x, z, y = 2.9) {
  const e = etiquette(texte, couleur, "zone piece");
  e.position.set(x, y, z);
  scene.add(e);
}

// Bureau fermé le long de la façade nord.
export function bureau(
  scene,
  grille,
  facade,
  x0,
  x1,
  nom,
  couleur,
  grand = false,
) {
  const cx = (x0 + x1) / 2;
  const fond = Math.max(facade(x0), facade(x1));
  solForme(
    scene,
    [
      [x0, facade(x0)],
      [x1, facade(x1)],
      [x1, -4.5],
      [x0, -4.5],
    ],
    MAT.parquet,
  );
  titre(scene, nom, couleur, cx, (fond + -4.5) / 2);
  const p = poste(scene, grille, cx - 0.3, fond + 1.9, Math.PI, couleur, false);
  chaise(scene, "#3b2a22", cx - 0.6, fond + 3.1, 0);
  chaise(scene, "#3b2a22", cx + 0.2, fond + 3.1, 0);
  plante(scene, grille, x1 - 0.5, -4.5 - 0.5, 1.2, true);
  if (grand) {
    tapis(scene, cx + 1.2, fond + 2.6, 2.4, 1.8, "#4a3728");
    canape(scene, grille, x1 - 0.7, fond + 2.6, Math.PI / 2, MAT.cuir, 1.8);
  } else credence(scene, grille, cx, fond + 0.45, Math.PI, x1 - x0 - 1.4);
  return p;
}

// Les espaces communs : accueil, bibliothèque, Backstage, Comptoir, coworking.
export function espaces(scene, grille) {
  // Accueil
  sol(scene, -2, 6, 2, 6, MAT.parquet, 0.015);
  titre(scene, "Accueil", ZIK.neon, 2, 4.8);
  boite(scene, 3, 1.1, 0.7, MAT.blanc, 2, 0.55, 4.4);
  boite(scene, 3.1, 0.05, 0.85, MAT.chene, 2, 1.12, 4.35);
  grille.bloquer(2, 4.4, 3, 0.7, 0.12);
  const invite = canape(scene, grille, -1.4, 4.2, -Math.PI / 2, MAT.cuir, 1.8);
  plante(scene, grille, 5.4, 2.6, 1.3, true);

  // Bibliothèque, Backstage, Comptoir, coworking
  titre(scene, "La Bibliothèque", "#c49a6c", -7, 3.6);
  tapis(scene, -7, 4, 6, 3, "#2e7a43", 0.5);
  bibliotheque(scene, grille, -7.5, 5.6, Math.PI, 4);
  const lecture = [
    fauteuil(scene, grille, -9.2, 3.2, Math.PI / 4, "#FF8C42"),
    fauteuil(scene, grille, -5.2, 3.2, -Math.PI / 4, "#5BC0EB"),
  ];
  plante(scene, grille, -10.6, 5.4, 1.3, true);
  titre(scene, "Le Backstage", ZIK.neon, 2, 8);
  tapis(scene, 2.2, 8.2, 5.4, 3.2, "#3b0d43");
  murVinyles(scene, -1.92, 8.3, Math.PI / 2);
  canape(scene, grille, 2.2, 9.6, 0);
  const salon = [
    fauteuil(scene, grille, 0, 8.3, Math.PI / 2, "#c026d3"),
    fauteuil(scene, grille, 4.4, 8.3, -Math.PI / 2, "#8C7BFF"),
  ];
  boite(scene, 1.2, 0.35, 0.7, MAT.chene, 2.2, 0.18, 8.2);
  grille.bloquer(2.2, 8.2, 1.2, 0.7, 0.1);
  casque(scene, grille, 5.2, 6.8, -0.4);
  jukebox(scene, grille, -1.3, 6.9, Math.PI / 2);
  titre(scene, "Le Comptoir", "#3DDC84", 11, 7.2);
  sol(scene, 6, 16, 6, 10, MAT.carrelage, 0.015);
  boite(scene, 6, 0.92, 0.65, MAT.blanc, 10.5, 0.46, 9.5);
  boite(scene, 6, 0.04, 0.68, MAT.chene, 10.5, 0.94, 9.5);
  boite(scene, 0.4, 0.45, 0.35, MAT.noir, 8.3, 1.18, 9.5);
  boite(scene, 0.8, 2, 0.65, MAT.alu, 14.2, 1, 9.3);
  grille.bloquer(10.5, 9.5, 6.4, 0.65, 0.15);
  const cafe = [
    ...tableCafe(scene, grille, 8.4, 7.4, "#3DDC84"),
    ...tableCafe(scene, grille, 11, 7.4, "#F4E04D"),
    ...tableCafe(scene, grille, 13.6, 7.4, "#FF4F9A"),
  ];
  murVegetal(scene, 16.5, 4.9, -Math.PI / 4, 2.4);
  poufs(scene, grille, 14.8, 3.4, ["#3DDC84", "#c026d3", "#F4E04D"]);
  titre(scene, "Coworking", "#94A3B8", 14.4, -2.6);
  const renforts = [13.6, 15.2].flatMap((x) => [
    poste(scene, grille, x, -1.6, Math.PI, "#94A3B8"),
    poste(scene, grille, x, -0.75, 0, "#94A3B8"),
  ]);
  for (const [x, z] of [
    [-19.3, -6.8],
    [-19.3, 5.3],
    [5.6, 5.4],
    [16.4, -3.6],
    [-3, -4],
    [11.8, 2],
  ])
    plante(scene, grille, x, z, 1.2, true);

  const pauses = [
    ...cafe.slice(0, 6),
    ...lecture,
    ...salon,
    { place: V(9.6, 8.9), angle: Math.PI },
    { place: V(11.4, 8.9), angle: Math.PI },
    { place: V(-18.8, -3.4), angle: Math.PI / 2 },
    { place: V(20.2, -0.5), angle: -Math.PI / 2 },
  ];
  return { invite, renforts, pauses };
}
