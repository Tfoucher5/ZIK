import * as THREE from "three";
import { MAT, etiquette, mur, plante, poste, solForme } from "./meubles.js";
import { credence, tapis } from "./deco.js";
import { COULEURS, SALLES, contour, facades } from "./batiment.js";
import { NOMS, OUEST } from "./disposition.js";
import { bandeNord } from "./nord.js";
import { salle } from "./salles.js";
import { espaces } from "./espaces.js";

export { COULEURS, limites } from "./batiment.js";

const DECOR = {
  plante: (scene, grille, x, z) => plante(scene, grille, x, z, 1.1, true),
  etagere: credence,
  cloison: (scene, grille, x0, z0, x1, z1) =>
    mur(scene, grille, x0, z0, x1, z1, { type: "plein", h: 1.1 }),
};

// Signalétique d'un quartier : grand nom du pôle et liseré de sa couleur au sol autour des îlots.
function signaletique(scene, id, [x, z], ilots) {
  const e = etiquette(NOMS[id], COULEURS[id], "zone pole");
  e.position.set(x, 3.4, z);
  scene.add(e);
  const dedans = ilots.filter((b) => b[0] > OUEST);
  const [x0, z0, x1, z1] = [0, 1, 2, 3].map((k) =>
    (k < 2 ? Math.min : Math.max)(
      ...dedans.map((b) => b[k] + (k < 2 ? -0.35 : 0.35)),
    ),
  );
  const c = COULEURS[id];
  for (const [cx, cz, l, p] of [
    [(x0 + x1) / 2, z0, x1 - x0, 0.12],
    [(x0 + x1) / 2, z1, x1 - x0, 0.12],
    [x0, (z0 + z1) / 2, 0.12, z1 - z0],
    [x1, (z0 + z1) / 2, 0.12, z1 - z0],
  ])
    tapis(scene, cx, cz, l, p, c, 0.85);
}

// Espace d'un pôle : signalétique, un tapis par îlot, le décor et les postes.
function quartier(scene, grille, id, { titre: t, ilots, deco, postes }) {
  const c = COULEURS[id];
  signaletique(scene, id, t, ilots);
  for (const [x0, z0, x1, z1] of ilots)
    tapis(scene, (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, c, 0.16);
  for (const [type, ...v] of deco) DECOR[type](scene, grille, ...v);
  return { postes: postes.map((b) => poste(scene, grille, b.x, b.z, b.a, c)) };
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
    services,
    renforts,
    accueil,
    pauses: [...pauses, invite, ...nord.detente, ...nord.platine, ...nord.wc],
    ascenseur: {
      place: new THREE.Vector3(-0.5, 0, 2.6),
      angle: 0,
      debout: true,
    },
  };
}
