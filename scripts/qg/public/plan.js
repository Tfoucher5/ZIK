import * as THREE from "three";
import { MAT, mur, poste, solForme, titre } from "./meubles.js";
import { tapis } from "./deco.js";
import { COULEURS, SALLES, contour, facades } from "./batiment.js";
import { NOMS } from "./disposition.js";
import { bandeNord } from "./nord.js";
import { salle } from "./salles.js";
import { espaces } from "./espaces.js";

export { COULEURS, limites } from "./batiment.js";

// Deux rangées de bureaux dos à dos à partir de x ; le chef est au bout, face à son équipe.
// Les postes vont du plus proche au plus loin du bord : les postes libres restent au bout.
function quartier(scene, grille, id, { x, sens, z, cols }) {
  const c = COULEURS[id];
  const l = cols * 1.6;
  const cx = x + (sens * l) / 2;
  titre(scene, NOMS[id], c, cx, z - 1.3, null, 3.2);
  tapis(scene, cx + (sens * 0.9) / 2, z + 0.42, l + 2.4, 3.7, c, 0.16);
  const postes = [];
  for (let k = 0; k < cols; k++)
    for (let r = 0; r < 2; r++)
      postes.push(
        poste(
          scene,
          grille,
          x + sens * (k + 0.5) * 1.6,
          r ? z + 0.85 : z,
          r ? 0 : Math.PI,
          c,
        ),
      );
  const chef = poste(
    scene,
    grille,
    x + sens * (l + 0.7),
    z + 0.42,
    (sens * Math.PI) / 2,
    c,
    false,
  );
  return { chef, postes };
}

// { poles, ouest } : place des pôles et bord ouest du bâtiment, calculés par disposer().
export function plan(scene, grille, { poles, ouest }) {
  const forme = contour(ouest);
  grille.masque(forme);
  const dalle = solForme(scene, forme, MAT.sombre, -0.3);
  dalle.material.side = THREE.DoubleSide;
  solForme(scene, forme, MAT.beton, 0);
  for (const [x0, z0, x1, z1, type, h] of facades(ouest))
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
  for (const [id, p] of Object.entries(poles)) {
    services[id] = quartier(scene, grille, id, p);
    services[id].salle = salle(scene, grille, id);
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
