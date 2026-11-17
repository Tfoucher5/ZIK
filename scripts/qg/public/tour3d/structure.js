// ZIK TOWER en 3D, gros œuvre et enveloppe, entièrement lus dans tour/plan.js.
import * as THREE from "three";
import { MAT } from "../meubles.js";
import { NIVEAUX } from "../tour/plan.js";
import { noyau } from "./ascenseur.js";
import { versLocal } from "./repere.js";
import {
  DALLE,
  dalle,
  emprise,
  etatCoupe,
  gamme,
  pieux,
  plafondCoupe,
  poteaux,
} from "./structure-plan.js";
import {
  facade,
  instances,
  materiaux,
  matrice,
  toits,
} from "./structure-facade.js";
import { couronnement } from "./structure-toit.js";

const NEZ = 0.15;
const RADIER = 0.6;
const forme = ([x1, y1, x2, y2], marge = 0) => {
  const a = versLocal(x1 - marge, y1 - marge);
  const b = versLocal(x2 + marge, y2 + marge);
  const s = new THREE.Shape();
  s.moveTo(a.x, a.z).lineTo(b.x, a.z).lineTo(b.x, b.z).lineTo(a.x, b.z);
  return s;
};

// Dalle sous le sol fini (y = 0), qui déborde en nez de dalle ; trous des vides et des trémies.
function poserDalle(g, d, mats, epaisseur) {
  const s = forme(d.rect, NEZ);
  for (const t of [...d.trous, ...d.verrieres]) s.holes.push(forme(t, -0.01));
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: epaisseur,
    bevelEnabled: false,
  });
  geo.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(geo, [mats.sol, mats.nez]);
  m.position.y = -0.01;
  m.castShadow = m.receiveShadow = true;
  g.add(m);
}

const cylindre = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);

export function structure(scene) {
  const groupes = {};
  const sudHaut = {};
  const mats = {};
  NIVEAUX.forEach((n, i) => {
    const g = new THREE.Group();
    g.name = `niveau-${n.id}`;
    g.position.y = n.z;
    scene.add(g);
    groupes[n.id] = g;
    const m = (mats[n.id] = materiaux(gamme(n)));
    poserDalle(g, dalle(i), m, i === 0 ? RADIER : DALLE);
    const H = n.h - DALLE;
    instances(
      g,
      poteaux(n).map(([x, y]) => {
        const c = versLocal(x, y);
        return matrice(c.x, H / 2, c.z, 0.6, H, 0.6);
      }),
      m.poteau,
    );
    if (n.facade !== false) sudHaut[n.id] = facade(g, n, m);
    toits(g, n, i, m);
    if (i === NIVEAUX.length - 1) {
      const couverture = new THREE.Group();
      couverture.position.y = n.h;
      g.add(couverture);
      poserDalle(
        couverture,
        { rect: emprise(n), trous: [], verrieres: [] },
        m,
        DALLE,
      );
    }
  });

  const fond = 6;
  instances(
    groupes[NIVEAUX[0].id],
    pieux().map(([x, y]) => {
      const c = versLocal(x, y);
      return matrice(c.x, -RADIER - fond / 2, c.z, 0.9, fond, 0.9);
    }),
    MAT.beton,
    cylindre,
  );

  const n = noyau(scene, groupes);
  const animerToit = couronnement(groupes, mats);

  return {
    groupes,
    ascenseurs: n.ascenseurs,
    coupe(choix) {
      const e = etatCoupe(choix);
      for (const [id, g] of Object.entries(groupes)) {
        g.visible = e[id].visible;
        if (sudHaut[id]) sudHaut[id].visible = !e[id].ouvert;
      }
      n.limite(plafondCoupe(choix));
    },
    animer(dt, t) {
      n.animer(dt);
      animerToit(dt, t);
    },
    fenetres(niveauId, allumees) {
      mats[niveauId].vitrage.emissiveIntensity = allumees ? 0.45 : 0;
    },
  };
}
