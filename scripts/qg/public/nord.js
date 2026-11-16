import { MAT, mur, sol, solForme, titre } from "./meubles.js";
import { ZIK, canape, jukebox, neonZik, tapis } from "./deco.js";
import { bibliotheque, fauteuil } from "./pieces.js";
import { ascenseurs, escalier, sanitaires, studio } from "./noyau.js";
import { FRONT, contreFacade, facade } from "./batiment.js";

const GRIS = "#c3c8cf";

// Bande nord (coins de détente, studio) et noyau central (toilettes, ascenseurs, escalier).
// Les bureaux des chefs et la salle du board sont à l'étage de la Direction.
export function bandeNord(scene, grille) {
  for (const x of [-15, -9, -2, 1.5, 5, 12, 17.5])
    mur(scene, grille, x, FRONT, x, facade(x), {
      type: x === -9 ? "verre" : "plein",
    });
  const fronts = [
    [-20, -15, "verre"],
    [-15, -9, "verre"],
    [-9, -2, "verre"],
    [-2, 1.5, "plein"],
    [1.5, 5, "plein"],
    [5, 12, "verre"],
    [12, 17.5, "verre"],
  ];
  for (const [a, b, type] of fronts)
    mur(scene, grille, a, FRONT, b, FRONT, {
      type,
      portes: [[b - a - 1.45, b - a - 0.25]],
    });

  solForme(scene, contreFacade(-20, -15), MAT.parquet);
  titre(scene, "La Loge", "#3DDC84", -17.5, -6.2, "détente");
  const detente = [
    canape(scene, grille, -17.8, -7.1, 0, MAT.velours, 2),
    canape(scene, grille, -17.8, -5.3, Math.PI, MAT.tissu, 2),
  ];

  solForme(scene, contreFacade(-2, 1.5), MAT.parquet);
  titre(scene, "La Bulle", "#5BC0EB", -0.25, -6.2, "coin calme");
  detente.push(fauteuil(scene, grille, -0.6, -6.3, Math.PI, "#5BC0EB"));

  solForme(scene, contreFacade(1.5, 5), MAT.sombre);
  titre(scene, "La Platine", ZIK.neon, 3.25, -6.9, "studio son");
  const platine = [
    studio(scene, grille, 3.25, facade(3.25) + 1.1),
    canape(scene, grille, 2.6, FRONT - 0.75, 0, MAT.velours, 1.6),
  ];

  solForme(scene, contreFacade(5, 12), MAT.parquet);
  titre(scene, "Le Backstage", ZIK.neon, 8.5, -6.8, "salon");
  tapis(scene, 8.5, -6.8, 4, 2.6, "#4a2a5a");
  detente.push(
    canape(scene, grille, 8.5, -8.3, Math.PI, MAT.velours, 2.4),
    fauteuil(scene, grille, 6.4, -6.6, -Math.PI / 2, "#FF4F9A"),
    fauteuil(scene, grille, 10.6, -6.6, Math.PI / 2, "#F4E04D"),
  );
  jukebox(scene, grille, 11.2, -8.8, -Math.PI / 2);

  solForme(scene, contreFacade(12, 17.5), MAT.parquet);
  titre(scene, "Le Silence", "#c49a6c", 14.7, -6.4, "bibliothèque");
  bibliotheque(scene, grille, 13.9, facade(13.9) + 0.4, 0, 2.6);
  detente.push(
    fauteuil(scene, grille, 13.6, -6.6, Math.PI, "#8C7BFF"),
    fauteuil(scene, grille, 15.4, -6.6, Math.PI, "#FF8C42"),
  );

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
  return { detente, platine, wc };
}
