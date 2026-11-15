import * as THREE from "three";
import {
  MAT,
  boite,
  chaise,
  cylindre,
  ecran,
  plante,
  poste,
  sol,
  titre,
} from "./meubles.js";
import { ZIK, canape, jukebox, murVinyles, tapis } from "./deco.js";
import {
  bibliotheque,
  casque,
  fauteuil,
  murVegetal,
  poufs,
  tableCafe,
} from "./pieces.js";
import { cabine } from "./noyau.js";

const V = (x, z) => new THREE.Vector3(x, 0, z);
const debout = (x, z, angle) => ({ place: V(x, z), angle, debout: true });

// L'entrée : banque d'accueil face aux ascenseurs, poste de l'hôtesse, canapé des visiteurs.
function accueil(scene, grille) {
  sol(scene, -2, 6, 2, 6, MAT.parquet, 0.015);
  titre(scene, "L'Entrée des artistes", ZIK.neon, 4.6, 4.4, "accueil");
  boite(scene, 3, 1.1, 0.5, MAT.blanc, 2, 0.55, 4.4);
  boite(scene, 3.1, 0.05, 0.62, MAT.chene, 2, 1.12, 4.38);
  boite(scene, 2.4, 0.05, 0.6, MAT.blanc, 2, 0.74, 4.95);
  const e = ecran("#ff00ff");
  e.position.set(2.3, 1.05, 4.75);
  scene.add(e);
  boite(scene, 0.6, 0.36, 0.03, MAT.noir, 2.3, 1.05, 4.73);
  chaise(scene, "#c026d3", 2, 5.45, 0);
  grille.bloquer(2, 4.95, 3.2, 1.6, 0.1);
  const invite = canape(scene, grille, -1.4, 4.2, -Math.PI / 2, MAT.cuir, 1.8);
  boite(scene, 0.6, 0.35, 0.6, MAT.chene, -0.4, 0.18, 4.2);
  grille.bloquer(-0.4, 4.2, 0.6, 0.6, 0.1);
  cylindre(scene, 0.03, 1.8, MAT.noir, -1.6, 0.9, 2.5, 8);
  for (const a of [0, 2, 4])
    cylindre(
      scene,
      0.15,
      0.7,
      MAT.tissu,
      -1.6 + Math.cos(a) * 0.12,
      1.3,
      2.5 + Math.sin(a) * 0.12,
      8,
    );
  grille.bloquer(-1.6, 2.5, 0.4, 0.4, 0.1);
  plante(scene, grille, 5.4, 2.6, 1.3, true);
  plante(scene, grille, 5.6, 5.4, 1.2, true);
  return { invite, hotesse: { place: V(2, 5.4), angle: Math.PI } };
}

// La Fosse (salon détente) et Le Bœuf (cuisine, comme on « fait un bœuf » entre musiciens).
function detente(scene, grille) {
  titre(scene, "La Fosse", ZIK.neon, 2, 7.6, "salon détente");
  tapis(scene, 2.2, 8.2, 5.4, 3.2, "#3b0d43");
  murVinyles(scene, -1.92, 8.3, Math.PI / 2);
  const salon = [
    canape(scene, grille, 2.2, 9.3, 0),
    fauteuil(scene, grille, 0, 8.3, -Math.PI / 2, "#c026d3"),
    fauteuil(scene, grille, 4.4, 8.3, Math.PI / 2, "#8C7BFF"),
  ];
  boite(scene, 1.2, 0.35, 0.7, MAT.chene, 2.2, 0.18, 8.2);
  grille.bloquer(2.2, 8.2, 1.2, 0.7, 0.1);
  casque(scene, grille, 5.2, 6.8, -0.4);
  jukebox(scene, grille, -1.3, 6.9, Math.PI / 2);

  titre(scene, "Le Bœuf", "#3DDC84", 11, 7.2, "cuisine");
  sol(scene, 6, 16, 6, 10, MAT.carrelage, 0.015);
  boite(scene, 6, 0.92, 0.65, MAT.blanc, 10.5, 0.46, 9.5);
  boite(scene, 6, 0.04, 0.68, MAT.chene, 10.5, 0.94, 9.5);
  boite(scene, 0.4, 0.45, 0.35, MAT.noir, 8.3, 1.18, 9.5);
  boite(scene, 0.8, 2, 0.65, MAT.alu, 14.2, 1, 9.3);
  grille.bloquer(10.5, 9.4, 7.8, 0.85, 0.15);
  const cafe = [
    ...tableCafe(scene, grille, 8.4, 7.4, "#3DDC84"),
    ...tableCafe(scene, grille, 11, 7.4, "#F4E04D"),
    ...tableCafe(scene, grille, 13.6, 7.4, "#FF4F9A"),
  ];
  boite(scene, 0.4, 1, 0.4, MAT.blanc, 16.9, 0.5, 6.3);
  cylindre(
    scene,
    0.15,
    0.45,
    new THREE.MeshStandardMaterial({
      color: "#7dd3fc",
      transparent: true,
      opacity: 0.7,
    }),
    16.9,
    1.23,
    6.3,
  );
  grille.bloquer(16.9, 6.3, 0.4, 0.4, 0.1);
  return [
    ...cafe.slice(0, 6),
    ...salon,
    debout(9.6, 8.9, Math.PI),
    debout(11.4, 8.9, Math.PI),
    debout(16.4, 6.8, Math.PI / 2),
  ];
}

// Les espaces communs de l'open space ; renvoie les places de pause, d'accueil et des renforts.
export function espaces(scene, grille) {
  const { invite, hotesse } = accueil(scene, grille);
  const pauses = detente(scene, grille);

  titre(scene, "La Discothèque", "#c49a6c", -7, 3.6, "bibliothèque");
  tapis(scene, -7, 4, 6, 3, "#2e7a43", 0.5);
  bibliotheque(scene, grille, -7.5, 5.35, Math.PI, 4);
  // Les fauteuils regardent l'intérieur du coin lecture, dos à l'open space.
  pauses.push(
    fauteuil(scene, grille, -9.2, 3.2, (-3 * Math.PI) / 4, "#FF8C42"),
    fauteuil(scene, grille, -5.2, 3.2, (3 * Math.PI) / 4, "#5BC0EB"),
  );

  titre(scene, "Les Choristes", "#94A3B8", 15, -2.6, "postes des renforts");
  const renforts = [14.2, 15.8].flatMap((x) => [
    poste(scene, grille, x, -1.6, Math.PI, "#94A3B8"),
    poste(scene, grille, x, -0.75, 0, "#94A3B8"),
  ]);
  murVegetal(scene, 16.95, 2.3, -Math.PI / 2, 2);
  poufs(scene, grille, 15.6, 2.4, ["#3DDC84", "#c026d3", "#F4E04D"]);

  // Cabines d'appel réparties dans l'open space, près des équipes.
  pauses.push(
    cabine(scene, grille, -19.35, 2.85, Math.PI / 2, "#5BC0EB"),
    cabine(scene, grille, -11.2, 5.2, Math.PI, "#F4E04D"),
    cabine(scene, grille, 14.3, 5, Math.PI, "#3DDC84"),
    cabine(scene, grille, 15.5, 5, Math.PI, "#FF4F9A"),
  );

  boite(scene, 0.7, 1, 0.6, MAT.blanc, 5.6, 0.5, 1.5);
  boite(scene, 0.6, 0.05, 0.4, MAT.noir, 5.6, 1.02, 1.5);
  grille.bloquer(5.6, 1.5, 0.7, 0.6, 0.1);
  pauses.push(
    debout(5.6, 2.2, Math.PI),
    debout(-18.5, 5.4, 0),
    debout(18.2, 7.4, 0.675),
  );
  plante(scene, grille, -19.3, 5.3, 1.2, true);

  return { invite, accueil: hotesse, renforts, pauses };
}
