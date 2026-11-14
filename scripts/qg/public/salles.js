import { MAT, chaise, plante, poste, solForme, titre } from "./meubles.js";
import { affiche, canape, credence, tapis } from "./deco.js";
import { tableReunion } from "./pieces.js";
import { COULEURS, FRONT, SALLES, contreFacade, facade } from "./batiment.js";

// Salle de réunion d'un service : sol complet, table, télé sur le petit côté, affiche en face.
export function salle(scene, grille, id) {
  const [nom, x0, x1, z0, z1, tele] = SALLES[id];
  const contour =
    z0 == null
      ? contreFacade(x0, x1, z1)
      : [
          [x0, z0],
          [x1, z0],
          [x1, z1],
          [x0, z1],
        ];
  solForme(scene, contour, MAT.moquette);
  const haut = z0 ?? Math.max(facade(x0), facade(x1));
  const cx = (x0 + x1) / 2;
  const cz = (haut + z1) / 2;
  const c = COULEURS[id];
  titre(scene, nom, c, cx, cz, "salle de réunion");
  const ouest = tele === "ouest";
  const largeur = x1 - x0;
  const r = tableReunion(
    scene,
    grille,
    cx + (ouest ? 0.3 : -0.3),
    cz,
    Math.min(2.6, largeur - 2.2),
    largeur > 5 ? 6 : 4,
    c,
    {
      x: ouest ? x0 + 0.1 : x1 - 0.1,
      z: cz,
      angle: ouest ? Math.PI / 2 : -Math.PI / 2,
    },
    nom,
  );
  affiche(
    scene,
    ouest ? x1 - 0.08 : x0 + 0.08,
    1.6,
    cz - 1,
    ouest ? -Math.PI / 2 : Math.PI / 2,
    id.length,
  );
  return r;
}

// Bureau fermé le long de la façade : sol complet, bureau dos à la fenêtre, deux chaises visiteurs.
export function bureau(scene, grille, x0, x1, nom, couleur, grand = false) {
  solForme(scene, contreFacade(x0, x1), MAT.parquet);
  const dx = grand ? x0 + 2 : (x0 + x1) / 2 - 0.3;
  const fond = Math.max(facade(dx - 0.8), facade(dx + 0.8));
  titre(scene, nom, couleur, (x0 + x1) / 2, FRONT - 1.4, "");
  const p = poste(scene, grille, dx, fond + 1.3, Math.PI, couleur, false);
  chaise(scene, "#3b2a22", dx - 0.45, fond + 2.45, 0);
  chaise(scene, "#3b2a22", dx + 0.45, fond + 2.45, 0);
  grille.bloquer(dx, fond + 2.45, 1.4, 0.5, 0.05);
  plante(scene, grille, x0 + 0.5, FRONT - 0.5, 1.1, true);
  if (grand) {
    tapis(scene, x1 - 1.6, FRONT - 2, 2.2, 2.4, "#4a3728");
    canape(scene, grille, x1 - 0.8, FRONT - 2, Math.PI / 2, MAT.cuir, 1.8);
  } else
    credence(
      scene,
      grille,
      x0 + 0.3,
      (fond + FRONT) / 2 + 0.3,
      Math.PI / 2,
      1.4,
    );
  return p;
}
