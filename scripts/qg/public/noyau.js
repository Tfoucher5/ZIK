import * as THREE from "three";
import { MAT, boite, cylindre, chaise } from "./meubles.js";
import { porte } from "./portes.js";

const mat = (c, o = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
const V = (x, z) => new THREE.Vector3(x, 0, z);

function groupe(scene, x, z, angle = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = angle;
  scene.add(g);
  return g;
}

// Point local (lx, lz) d'un objet posé en (x, z) et tourné de angle.
const monde = (x, z, angle, lx, lz) => [
  x + lx * Math.cos(angle) + lz * Math.sin(angle),
  z - lx * Math.sin(angle) + lz * Math.cos(angle),
];

// Escalier en deux volées avec palier, vu d'en haut.
export function escalier(scene, x, z, l, p) {
  const g = groupe(scene, x, z);
  const marches = 12;
  for (let k = 0; k < marches; k++) {
    const pz = -p / 2 + 0.4 + (k * (p - 1.4)) / marches;
    boite(
      g,
      l / 2 - 0.15,
      0.15 + k * 0.17,
      (p - 1.4) / marches,
      MAT.beton,
      -l / 4,
      (0.15 + k * 0.17) / 2,
      pz,
    );
    boite(
      g,
      l / 2 - 0.15,
      2.2 - k * 0.17,
      (p - 1.4) / marches,
      MAT.beton,
      l / 4,
      (2.2 - k * 0.17) / 2,
      pz,
    );
  }
  boite(g, l - 0.1, 2.2, 1, MAT.beton, 0, 1.1, p / 2 - 0.6);
  boite(g, 0.08, 2.4, p - 1.2, MAT.alu, 0, 1.2, -0.2);
}

// Bloc ascenseurs : deux portes inox sur la face qui donne sur l'accueil.
export function ascenseurs(scene, x, z, l, p) {
  const g = groupe(scene, x, z);
  boite(g, l, 2.6, p, mat("#d4d4d8"), 0, 1.3, 0);
  for (const dx of [-l / 4, l / 4]) {
    boite(g, 1.1, 2.15, 0.04, MAT.alu, dx, 1.08, p / 2 + 0.02);
    boite(g, 0.02, 2.15, 0.05, MAT.noir, dx, 1.08, p / 2 + 0.03);
    boite(
      g,
      0.08,
      0.16,
      0.03,
      mat("#111", { emissive: "#ff00ff", emissiveIntensity: 0.6 }),
      dx + 0.75,
      1.2,
      p / 2 + 0.02,
    );
  }
}

// Toilettes : cabines fermées par une porte le long du mur du fond, vasques en face.
// Renvoie la place de chaque cabine.
export function sanitaires(scene, grille, x0, x1, z0, z1) {
  const n = Math.round(x1 - x0);
  const l = (x1 - x0) / n;
  const prof = 1.25;
  const cloison = mat("#9ca3af");
  const places = [];
  for (let k = 0; k < n; k++) {
    const a = x0 + k * l;
    const cx = a + l / 2;
    if (k) {
      boite(scene, 0.04, 2, prof, cloison, a, 1, z0 + prof / 2);
      grille.segment(a, z0, a, z0 + prof, 0.05);
    }
    boite(scene, 0.4, 0.4, 0.55, MAT.blanc, cx, 0.2, z0 + 0.32);
    boite(scene, 0.42, 0.35, 0.16, MAT.blanc, cx, 0.6, z0 + 0.1);
    for (const [u, v] of [
      [a, cx - 0.35],
      [cx + 0.35, a + l],
    ]) {
      boite(scene, v - u, 2, 0.04, cloison, (u + v) / 2, 1, z0 + prof);
      grille.segment(u, z0 + prof, v, z0 + prof, 0.05);
    }
    porte(scene, cx - 0.35, z0 + prof, 0, 0.7, cloison);
    places.push({ place: V(cx, z0 + 0.5), angle: 0 });
  }
  boite(
    scene,
    x1 - x0 - 0.8,
    0.12,
    0.45,
    MAT.blanc,
    (x0 + x1) / 2 + 0.3,
    0.85,
    z1 - 0.3,
  );
  grille.bloquer((x0 + x1) / 2 + 0.3, z1 - 0.3, x1 - x0 - 0.8, 0.45, 0.1);
  for (let k = 0; k < 2; k++) {
    cylindre(scene, 0.15, 0.06, MAT.alu, x0 + 1.2 + k, 0.93, z1 - 0.3);
    boite(
      scene,
      0.6,
      0.7,
      0.02,
      mat("#cfe3f0", { metalness: 0.6, roughness: 0.1 }),
      x0 + 1.2 + k,
      1.55,
      z1 - 0.08,
    );
  }
  return places;
}

// Cabine acoustique pour un appel : trois parois, porte vitrée, tablette et pouf. Renvoie sa place.
export function cabine(scene, grille, x, z, angle, couleur) {
  const g = groupe(scene, x, z, angle);
  const c = mat(couleur, { roughness: 1 });
  boite(g, 1.1, 2.2, 0.08, c, 0, 1.1, -0.5);
  boite(g, 0.08, 2.2, 1, c, -0.55, 1.1, 0);
  boite(g, 0.08, 2.2, 1, c, 0.55, 1.1, 0);
  boite(g, 1.1, 0.08, 1.1, c, 0, 2.2, 0);
  boite(g, 0.7, 0.05, 0.35, MAT.chene, 0, 0.95, -0.3);
  boite(g, 0.45, 0.42, 0.4, MAT.velours, 0, 0.21, 0.15);
  cylindre(
    g,
    0.06,
    0.06,
    mat("#fff", { emissive: "#fff6d8", emissiveIntensity: 1 }),
    0,
    2.13,
    0,
    10,
  );
  const p = (lx, lz) => monde(x, z, angle, lx, lz);
  for (const [a, b] of [
    [p(-0.55, -0.5), p(0.55, -0.5)],
    [p(-0.55, -0.5), p(-0.55, 0.5)],
    [p(0.55, -0.5), p(0.55, 0.5)],
  ])
    grille.segment(...a, ...b, 0.05);
  porte(scene, ...p(-0.5, 0.5), angle, 1, MAT.verre);
  return { place: V(...p(0, 0.15)), angle: angle + Math.PI };
}

// La Platine : le studio son, console face à la fenêtre, enceintes, micro et canapé.
export function studio(scene, grille, x, z) {
  boite(scene, 1.8, 0.75, 0.7, MAT.noir, x, 0.38, z);
  const pupitre = boite(
    scene,
    1.7,
    0.06,
    0.6,
    mat("#2b2d36"),
    x,
    0.82,
    z + 0.05,
  );
  pupitre.rotation.x = 0.25;
  for (let k = 0; k < 14; k++)
    boite(
      scene,
      0.04,
      0.04,
      0.12,
      mat(k % 3 ? "#e5e7eb" : "#ff00ff", {
        emissive: k % 3 ? "#000" : "#ff00ff",
      }),
      x - 0.75 + k * 0.115,
      0.88,
      z + (k % 2) * 0.12,
    );
  for (const s of [-1, 1]) {
    boite(scene, 0.3, 0.45, 0.3, MAT.noir, x + s * 1.15, 0.98, z - 0.15);
    cylindre(
      scene,
      0.09,
      0.02,
      MAT.alu,
      x + s * 1.15,
      1.02,
      z + 0.01,
      12,
    ).rotation.x = Math.PI / 2;
    boite(scene, 0.05, 0.75, 0.05, MAT.noir, x + s * 1.15, 0.38, z - 0.15);
  }
  chaise(scene, "#1f2937", x, z + 0.75, 0);
  grille.bloquer(x, z + 0.25, 2.6, 1.3, 0.1);
  cylindre(scene, 0.02, 1.5, MAT.noir, x + 1.1, 0.75, z + 1.4, 6);
  cylindre(scene, 0.06, 0.16, MAT.alu, x + 1.1, 1.55, z + 1.4, 10);
  return { place: V(x, z + 0.75), angle: Math.PI };
}
