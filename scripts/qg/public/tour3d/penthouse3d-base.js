// Outils du mobilier du penthouse (types p-*) : géométries partagées, textures canvas en cache, pose d'après le plan.
import * as THREE from "three";
import { toile } from "../meubles.js";
import { versLocal } from "./repere.js";
import { centrePoly } from "./interieur-plan.js";
import { groupe, lueur, mat } from "./mobilier-base.js";

const GEO = {
  boite: new THREE.BoxGeometry(1, 1, 1),
  plan: new THREE.PlaneGeometry(1, 1),
  boule: new THREE.SphereGeometry(0.5, 16, 12),
};
const cylindres = new Map();
const geoCylindre = (haut, bas, seg) => {
  const k = `${haut}|${bas}|${seg}`;
  if (!cylindres.has(k))
    cylindres.set(k, new THREE.CylinderGeometry(haut, bas, 1, seg));
  return cylindres.get(k);
};

function poser(parent, geo, m, x, y, z, ombre) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = ombre;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}

export const bloc = (g, l, h, p, m, x, y, z, ombre = false) => {
  const o = poser(g, GEO.boite, m, x, y, z, ombre);
  o.scale.set(l, h, p);
  return o;
};
export const plaque = (g, l, h, m, x, y, z) => {
  const o = poser(g, GEO.plan, m, x, y, z, false);
  o.scale.set(l, h, 1);
  return o;
};
export const boule = (g, sx, sy, sz, m, x, y, z) => {
  const o = poser(g, GEO.boule, m, x, y, z, false);
  o.scale.set(sx, sy, sz);
  return o;
};
// Cylindre de rayon r (haut et bas proportionnels via k = bas / haut), hauteur h.
export const tube = (g, r, h, m, x, y, z, k = 1, seg = 16) => {
  const o = poser(g, geoCylindre(1, k, seg), m, x, y, z, false);
  o.scale.set(r, h, r);
  return o;
};

const textures = new Map();
export const texture = (cle, l, h, dessin) => {
  if (!textures.has(cle)) textures.set(cle, toile(l, h, dessin));
  return textures.get(cle);
};

export const P = {
  or: mat("#d9a521", { roughness: 0.2, metalness: 1 }),
  noir: mat("#0d0d10", { roughness: 0.15, metalness: 0.4 }),
  laque: mat("#f7f6f2", { roughness: 0.12, metalness: 0.1 }),
  noyer: mat("#4a2f1e", { roughness: 0.45 }),
  cuir: mat("#2a1810", { roughness: 0.5 }),
  verre: new THREE.MeshPhysicalMaterial({
    color: "#cfe8ff",
    transparent: true,
    opacity: 0.18,
    roughness: 0.05,
  }),
  feuille: mat("#2e6b3a", { roughness: 0.8, side: THREE.DoubleSide }),
  lumiere: lueur("#ffe2b0", 2.2),
  magenta: lueur("#d61fd6", 1.8),
};

// Groupe du meuble, centré, grand côté sur x local ; un rectangle tourne son +z local vers le centre de sa pièce.
export function pose(parent, m, c, versSalle = true) {
  if ("x1" in m) {
    const a = versLocal(m.x1, m.y1);
    const b = versLocal(m.x2, m.y2);
    const g = groupe(
      parent,
      (a.x + b.x) / 2,
      (a.z + b.z) / 2,
      Math.atan2(-(b.z - a.z), b.x - a.x),
    );
    return { g, d: { l: Math.hypot(b.x - a.x, b.z - a.z) } };
  }
  if (m.w === undefined) {
    const p = versLocal(m.x, m.y);
    return { g: groupe(parent, p.x, p.z), d: { r: m.r } };
  }
  const [cx, cy] = [m.x + m.w / 2, m.y + m.h / 2];
  let t = m.w < m.h ? Math.PI / 2 : 0;
  const [px, py] = c.piece ? centrePoly(c.piece.poly) : [cx, cy];
  if (versSalle && Math.sin(t) * (px - cx) + Math.cos(t) * (py - cy) < 0)
    t += Math.PI;
  const p = versLocal(cx, cy);
  const [l, q] = m.w >= m.h ? [m.w, m.h] : [m.h, m.w];
  return { g: groupe(parent, p.x, p.z, t), d: { l, q } };
}
