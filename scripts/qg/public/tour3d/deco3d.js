// Déco 3D d'un niveau (tour/deco.js) : panneaux en texture canvas, vinyles en InstancedMesh, quelques objets en géométrie.
import * as THREE from "three";
import { MAT, boite, cylindre, plante } from "../meubles.js";
import { jukebox, tapis } from "../deco.js";
import { DECO, FACES, taille } from "../tour/deco.js";
import { versLocal } from "./repere.js";
import { FORMATS, PEINTURES, toileDeco } from "./deco-toiles.js";
import { groupe, mat } from "./mobilier-base.js";

const MUR = 0.16;
const LUMINEUX = new Set(["neon", "logo", "onair", "partie"]);
const SANS_GRILLE = { bloquer() {} };
const ANGLES = { s: 0, n: Math.PI, e: Math.PI / 2, o: -Math.PI / 2 };
const materiaux = new Map();
const M = {
  bois: mat("#7c4a2a", { roughness: 0.5 }),
  rouge: mat("#9f1239", { roughness: 0.35 }),
  bleu: mat("#1e3a5f", { roughness: 0.35 }),
  tolex: mat("#141414", { roughness: 0.9 }),
  or: mat("#d4a017", { roughness: 0.25, metalness: 0.8 }),
  chrome: mat("#d1d5db", { roughness: 0.2, metalness: 0.9 }),
  socle: mat("#f5f5f4", { roughness: 0.6 }),
  vinyle: mat("#0b0b0b", { roughness: 0.3 }),
  rond: mat("#ffffff"),
};

function materiau(cle, type, peinture) {
  if (!materiaux.has(cle)) {
    const [l, h] = FORMATS[type] ?? [256, 256];
    const map = toileDeco(cle, l, h, peinture);
    const lum = LUMINEUX.has(type);
    materiaux.set(
      cle,
      new THREE.MeshStandardMaterial({
        map,
        emissiveMap: lum ? map : null,
        emissive: lum ? "#ffffff" : "#000000",
        emissiveIntensity: lum ? 0.9 : 0,
        roughness: 0.6,
      }),
    );
  }
  return materiaux.get(cle);
}

// Panneau mural : une seule face texturée (cadre compris dans la texture).
function panneau(g, e, l) {
  const cle = `${e.type}:${e.t ?? e.n ?? ""}`;
  const m = materiau(cle, e.type, PEINTURES[e.type](e.t ?? e.n ?? 0));
  const h = l * FORMATS[e.type][2];
  if (e.type === "logo") {
    const cote = M.tolex;
    boite(g, l, h, 0.14, [cote, cote, cote, cote, m, cote], 0, 0, 0.07);
    return;
  }
  const p = new THREE.Mesh(new THREE.PlaneGeometry(l, h), m);
  p.position.z = 0.01;
  g.add(p);
}

function guitare(g, corps, basse = false) {
  const disque = (r, y) => {
    const d = cylindre(g, r, 0.07, corps, 0, y, 0.06, 20);
    d.rotation.x = Math.PI / 2;
  };
  disque(0.19, -0.32);
  disque(0.14, -0.1);
  boite(g, 0.05, basse ? 0.8 : 0.62, 0.03, M.bois, 0, basse ? 0.4 : 0.32, 0.06);
  boite(g, 0.08, 0.16, 0.03, MAT.noir, 0, basse ? 0.86 : 0.7, 0.06);
}

// Objets muraux en géométrie, centre à la hauteur h, face vers +z local.
const MURAUX = {
  guitare: (g) => guitare(g, M.rouge),
  basse: (g) => guitare(g, M.bleu, true),
  casque: (g) => {
    const arceau = new THREE.Mesh(
      new THREE.TorusGeometry(0.1, 0.015, 6, 16, Math.PI),
      MAT.noir,
    );
    arceau.position.z = 0.08;
    g.add(arceau);
    for (const s of [-1, 1]) {
      const c = cylindre(g, 0.055, 0.05, MAT.noir, s * 0.1, -0.02, 0.08, 14);
      c.rotation.z = Math.PI / 2;
    }
    boite(g, 0.03, 0.03, 0.08, M.chrome, 0, 0.11, 0.04);
  },
};

// Objets posés, face vers +z local.
const POSES = {
  jukebox: (g) => jukebox(g, SANS_GRILLE, 0, 0, 0),
  plante: (g) => plante(g, SANS_GRILLE, 0, 0, 1.2, true),
  ampli: (g) => {
    boite(g, 0.78, 0.62, 0.34, M.tolex, 0, 0.31, 0);
    boite(g, 0.78, 0.3, 0.3, M.tolex, 0, 0.78, 0);
    const face = materiau("ampli", "ampli", PEINTURES.ampli());
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.56), face);
    p.position.set(0, 0.31, 0.175);
    g.add(p);
  },
  enceinte: (g) => {
    boite(g, 0.5, 1.1, 0.4, M.tolex, 0, 0.55, 0);
    for (const [r, y] of [
      [0.17, 0.4],
      [0.08, 0.85],
    ])
      cylindre(g, r, 0.02, MAT.noir, 0, y, 0.2, 18).rotation.x = Math.PI / 2;
  },
  micro: (g) => {
    cylindre(g, 0.16, 0.03, MAT.noir, 0, 0.015, 0, 16);
    cylindre(g, 0.012, 1.45, M.chrome, 0, 0.73, 0, 6);
    const tete = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 12, 8),
      M.chrome,
    );
    tete.position.set(0, 1.5, 0.03);
    g.add(tete);
  },
  platine: (g) => {
    boite(g, 0.8, 0.7, 0.45, M.bois, 0, 0.35, 0);
    cylindre(g, 0.16, 0.02, M.vinyle, -0.1, 0.72, 0, 24);
    cylindre(g, 0.05, 0.022, M.rouge, -0.1, 0.72, 0, 12);
    boite(g, 0.02, 0.02, 0.2, M.chrome, 0.2, 0.74, 0);
  },
  trophee: (g) => {
    boite(g, 0.42, 1, 0.42, M.socle, 0, 0.5, 0);
    cylindre(g, 0.08, 0.06, M.or, 0, 1.03, 0, 12);
    const coupe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.05, 0.28, 16),
      M.or,
    );
    coupe.position.y = 1.2;
    g.add(coupe);
    boite(g, 0.2, 0.06, 0.02, MAT.noir, 0, 0.8, 0.22);
  },
};

// Murs de vinyles : deux InstancedMesh par niveau (disques, étiquettes de couleur).
function vinyles(parent, liste) {
  const disques = liste.flatMap(({ x, z, angle, l, h }) => {
    const n = Math.max(1, Math.floor(l / 0.7));
    return Array.from({ length: n * 2 }, (_, k) => {
      const u = ((k % n) - (n - 1) / 2) * 0.7;
      return {
        x: x + Math.cos(angle) * u,
        z: z - Math.sin(angle) * u,
        y: h + (k < n ? 0.33 : -0.33),
        angle,
      };
    });
  });
  if (!disques.length) return;
  const couleurs = [
    "#FF4F9A",
    "#5BC0EB",
    "#F4E04D",
    "#3DDC84",
    "#8C7BFF",
    "#c026d3",
  ];
  const faire = (r, m, avance) => {
    const im = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(r, r, 0.012, 28),
      m,
      disques.length,
    );
    const o = new THREE.Object3D();
    o.rotation.order = "YXZ";
    disques.forEach((d, k) => {
      o.position.set(
        d.x + Math.sin(d.angle) * avance,
        d.y,
        d.z + Math.cos(d.angle) * avance,
      );
      o.rotation.set(Math.PI / 2, d.angle, 0);
      o.updateMatrix();
      im.setMatrixAt(k, o.matrix);
      if (r < 0.2)
        im.setColorAt(k, new THREE.Color(couleurs[k % couleurs.length]));
    });
    parent.add(im);
  };
  faire(0.28, M.vinyle, 0.02);
  faire(0.1, M.rond, 0.03);
}

export function deco3d(parent, niveau) {
  const murs = [];
  for (const e of DECO[niveau.id] ?? []) {
    const [dx, dy] = FACES[e.face];
    const angle = ANGLES[e.face];
    const { l, h } = taille(e);
    if (e.type === "tapis") {
      const c = versLocal(e.x, e.y);
      tapis(parent, c.x, c.z, e.l, e.p, "#3b1d4a", 0.95);
      continue;
    }
    if (e.sol) {
      const c = versLocal(e.x, e.y);
      POSES[e.type](groupe(parent, c.x, c.z, angle));
      continue;
    }
    const c = versLocal(e.x + dx * MUR, e.y + dy * MUR);
    if (e.type === "vinyles") murs.push({ x: c.x, z: c.z, angle, l, h });
    else if (MURAUX[e.type]) MURAUX[e.type](groupe(parent, c.x, c.z, angle, h));
    else panneau(groupe(parent, c.x, c.z, angle, h), e, l);
  }
  vinyles(parent, murs);
}
