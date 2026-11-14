import { MAT, cylindre, mur, sol, solForme, titre } from "./meubles.js";
import { ZIK, affiche, canape, neonZik } from "./deco.js";
import { tableReunion } from "./pieces.js";
import { ascenseurs, escalier, sanitaires, studio } from "./noyau.js";
import { COULEURS, FRONT, contreFacade, facade } from "./batiment.js";
import { bureau } from "./salles.js";

const GRIS = "#c3c8cf";

// Bande nord (bureaux, studio, salle du board) et noyau central (toilettes, ascenseurs, escalier).
export function bandeNord(scene, grille) {
  for (const x of [-15, -9, -2, 1.5, 5, 12, 17.5])
    mur(scene, grille, x, FRONT, x, facade(x), {
      type: x === -9 ? "verre" : "plein",
    });
  const fronts = [
    [-20, -15, "plein"],
    [-15, -9, "verre"],
    [-9, -2, "verre"],
    [-2, 1.5, "plein"],
    [1.5, 5, "plein"],
    [5, 12, "verre"],
    [12, 17.5, "plein"],
  ];
  for (const [a, b, type] of fronts)
    mur(scene, grille, a, FRONT, b, FRONT, {
      type,
      portes: [[b - a - 1.45, b - a - 0.25]],
    });
  const avocat = bureau(
    scene,
    grille,
    -20,
    -15,
    "Bureau de Victor",
    COULEURS.board,
  );
  const theo = bureau(scene, grille, -2, 1.5, "Bureau de Théo", "#ffffff");
  const ceo = bureau(
    scene,
    grille,
    12,
    17.5,
    "Bureau de Claire",
    COULEURS.ceo,
    true,
  );

  solForme(scene, contreFacade(1.5, 5), MAT.sombre);
  titre(scene, "La Platine", ZIK.neon, 3.25, -6.9, "studio son");
  const platine = [
    studio(scene, grille, 3.25, facade(3.25) + 1.1),
    canape(scene, grille, 2.6, FRONT - 0.75, 0, MAT.velours, 1.6),
  ];

  solForme(scene, contreFacade(5, 12), MAT.parquet);
  titre(scene, "Le Disque d'Or", COULEURS.board, 8.5, -7.3, "salle du board");
  const board = tableReunion(
    scene,
    grille,
    8.8,
    -7.3,
    4.2,
    8,
    ZIK.magenta,
    { x: 5.1, z: -7.3, angle: Math.PI / 2 },
    "Le Disque d'Or",
  );
  affiche(scene, 11.92, 1.6, -8.3, -Math.PI / 2, 1);
  const disque = cylindre(scene, 0.38, 0.03, MAT.or, 11.92, 1.6, -6.3, 32);
  disque.rotation.z = Math.PI / 2;

  mur(scene, grille, -2, -3.2, 5, -3.2, { type: "plein" });
  mur(scene, grille, -2, -3.2, -2, 2, {
    type: "plein",
    portes: [[1.35, 2.25]],
  });
  mur(scene, grille, 1, -3.2, 1, 2, { type: "plein" });
  mur(scene, grille, 5, -3.2, 5, 2, { type: "plein" });
  mur(scene, grille, 1, 2, 5, 2, { type: "plein", portes: [[2.9, 3.8]] });
  mur(scene, grille, -2, -0.6, 1, -0.6, { type: "plein" });
  sol(scene, -2, 5, -3.2, 2, MAT.carrelage, 0.02);
  const wc = sanitaires(scene, grille, -2, 1, -3.2, -0.6);
  ascenseurs(scene, -0.5, 0.7, 3, 2.6);
  grille.bloquer(-0.5, 0.7, 3, 2.6, 0.2);
  escalier(scene, 3, -0.6, 3.8, 5);
  grille.bloquer(3, -0.6, 3.8, 5, 0);
  neonZik(scene, 2.4, 2.09, 0, 2.6);
  titre(scene, "Ascenseurs", GRIS, -0.5, 2.4, "", 2.7);
  titre(scene, "Escalier", GRIS, 3, -1.8, "", 2.7);
  titre(scene, "Toilettes", GRIS, -0.5, -2, "", 2.7);
  return { avocat, theo, ceo, board, platine, wc };
}
