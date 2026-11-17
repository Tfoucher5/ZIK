import * as THREE from "three";
import { MAT, boite, cylindre, ecran } from "../meubles.js";

export const mat = (c, o = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
export const lueur = (c, i = 1) =>
  new THREE.MeshStandardMaterial({
    color: "#0b0f18",
    emissive: new THREE.Color(c),
    emissiveIntensity: i,
  });

export const M = {
  inox: mat("#c9ced4", { roughness: 0.25, metalness: 0.85 }),
  gris: mat("#8a8f98"),
  anthracite: mat("#3a3d45"),
  feutre: mat("#6b7280", { roughness: 1 }),
  vert: mat("#2f6b45", { roughness: 0.6 }),
  lin: mat("#e8e2d6", { roughness: 1 }),
  caoutchouc: mat("#22252b", { roughness: 0.95 }),
  bleu: mat("#2d5f8a"),
  rouge: mat("#a3332f"),
  eau: mat("#3f8fbf", { roughness: 0.1, transparent: true, opacity: 0.75 }),
  ecorce: mat("#6b4a32", { roughness: 1 }),
  noyer: mat("#5a3b28", { roughness: 0.5 }),
  led: lueur("#3ddc84", 1.5),
  bleuLed: lueur("#5bc0eb", 1.2),
};

export const NEUTRE = "#8ab4ff";
export const MAGENTA = "#c026d3";

export function groupe(parent, x, z, rot = 0, y = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rot;
  parent.add(g);
  return g;
}

export const pied = (g, x, z, h, m = MAT.noir) =>
  cylindre(g, 0.025, h, m, x, h / 2, z, 6);

// Écran posé dans un cadre noir, face +z local.
export function moniteur(g, x, y, z, l, h, couleur = NEUTRE, rot = 0) {
  boite(g, l + 0.04, h + 0.04, 0.03, MAT.noir, x, y, z - 0.02).rotation.y = rot;
  const e = ecran(couleur, l, h);
  e.position.set(x, y, z);
  e.rotation.y = rot;
  g.add(e);
  return e;
}

export function fauteuil(g, x, z, rot = 0, m = M.anthracite) {
  const f = groupe(g, x, z, rot);
  boite(f, 0.52, 0.09, 0.5, m, 0, 0.5, 0);
  boite(f, 0.5, 0.6, 0.07, m, 0, 0.88, 0.24).rotation.x = -0.12;
  cylindre(f, 0.03, 0.42, MAT.alu, 0, 0.25, 0, 8);
  boite(f, 0.56, 0.03, 0.05, MAT.noir, 0, 0.04, 0);
  boite(f, 0.05, 0.03, 0.56, MAT.noir, 0, 0.04, 0);
  return f;
}

export function tabouret(g, x, z, h = 0.75) {
  cylindre(g, 0.19, 0.06, M.anthracite, x, h, z, 12);
  cylindre(g, 0.025, h, MAT.alu, x, h / 2, z, 6);
  cylindre(g, 0.18, 0.02, MAT.alu, x, 0.01, z, 12);
}

// Poste assis-debout à double écran, fauteuil côté occupant (+z local) ; banque et comptoir : meuble haut.
export function bureau3d(parent, b, couleur = NEUTRE) {
  const g = groupe(parent, b.x, b.z, b.rot);
  const { l, p } = b;
  if (b.sorte === "comptoir")
    return moniteur(g, 0, 1.3, 0, 0.36, 0.22, couleur);
  if (b.sorte === "banque") {
    boite(g, l, 1.02, p, MAT.blanc, 0, 0.51, 0);
    boite(g, l + 0.06, 0.04, p + 0.1, MAT.chene, 0, 1.04, 0);
    fauteuil(g, 0, p / 2 + 0.4);
    return moniteur(g, 0, 1.25, p / 2 - 0.25, 0.42, 0.26, couleur);
  }
  boite(g, l - 0.04, 0.04, p - 0.04, MAT.blanc, 0, 0.74, 0);
  for (const s of [-1, 1]) {
    boite(g, 0.06, 0.7, 0.06, MAT.alu, s * (l / 2 - 0.15), 0.36, 0);
    boite(g, 0.06, 0.03, p - 0.1, MAT.alu, s * (l / 2 - 0.15), 0.02, 0);
  }
  const zEcran = -p / 2 + 0.14;
  const e = moniteur(g, -0.29, 1.08, zEcran, 0.54, 0.32, couleur, 0.12);
  moniteur(g, 0.29, 1.08, zEcran, 0.54, 0.32, couleur, -0.12);
  boite(g, 0.05, 0.28, 0.05, MAT.noir, 0, 0.9, zEcran - 0.05);
  boite(g, 0.44, 0.02, 0.14, MAT.blanc, 0, 0.77, 0.1);
  boite(g, 0.07, 0.02, 0.1, MAT.blanc, 0.32, 0.77, 0.12);
  fauteuil(g, 0, p / 2 + 0.35);
  return e;
}
