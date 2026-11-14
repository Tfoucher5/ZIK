import * as THREE from "three";
import { MAT, mur, poste, solForme, titre } from "./meubles.js";
import { tapis } from "./deco.js";
import { CONTOUR, COULEURS, FACADES, SALLES } from "./batiment.js";
import { bandeNord } from "./nord.js";
import { salle } from "./salles.js";
import { espaces } from "./espaces.js";

export { COULEURS, LIMITES } from "./batiment.js";

// Quartiers de l'open space : centre, rangée (z), colonnes, côté du bureau du chef.
const QUARTIERS = {
  tech: [-16, -1.5, 4, 1],
  produit: [-5.8, -1.5, 3, -1],
  argent: [-15.5, 3, 2, 1],
  operations: [8.4, -1.5, 3, 1],
  marketing: [8, 3, 2, 1],
};

// Deux rangées de bureaux dos à dos ; le chef est en bout, face à son équipe.
function quartier(scene, grille, id, nom, equipe) {
  const [cx, z0, cols, cote] = QUARTIERS[id];
  const c = COULEURS[id];
  const l = cols * 1.6;
  titre(scene, nom, c, cx, z0 - 1.3, null, 3.2);
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
    cote > 0 ? Math.PI / 2 : -Math.PI / 2,
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
  for (const [x0, z0, x1, z1, type, h] of FACADES)
    mur(scene, grille, x0, z0, x1, z1, { type, h });
  const nord = bandeNord(scene, grille);

  // Salles de l'est et du sud-ouest, portes côté open space.
  const [, x0, x1, z0, z1] = SALLES.marketing;
  mur(scene, grille, x0, z0, x1, z0, { portes: [[4.6, 5.8]], sens: 1 });
  mur(scene, grille, x1, z0, x1, z1, { type: "plein" });
  mur(scene, grille, 17, -3, 21, -3, { type: "plein", portes: [[0.3, 1.5]] });
  mur(scene, grille, 17, 1, 21, 1, { type: "plein" });
  mur(scene, grille, 17, 5.5, 21, 5.5, { type: "plein" });
  mur(scene, grille, 17, -3, 17, 1);
  mur(scene, grille, 17, 1, 17, 5.5, { portes: [[3.1, 4.3]] });

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

  const { accueil, invite, renforts, pauses } = espaces(scene, grille);
  return {
    ...nord,
    services,
    renforts,
    accueil,
    invite,
    pauses: [...pauses, ...nord.platine, ...nord.wc],
    ascenseur: {
      place: new THREE.Vector3(-0.5, 0, 2.6),
      angle: 0,
      debout: true,
    },
  };
}
