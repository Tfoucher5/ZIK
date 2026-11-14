import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

export function toile(l, h, dessin) {
  const c = document.createElement("canvas");
  c.width = l;
  c.height = h;
  dessin(c.getContext("2d"), l, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function grain(fond, rgb, motif) {
  const t = toile(256, 256, (x) => {
    x.fillStyle = fond;
    x.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 2500; k++) {
      x.fillStyle = `rgba(${rgb},${Math.random() * 0.07})`;
      x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    motif?.(x);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const lames = (x) => {
  x.strokeStyle = "rgba(70,40,15,0.22)";
  for (let y = 0; y < 256; y += 32) {
    x.strokeRect(((y * 7) % 256) - 256, y, 512, 32);
  }
};
const dalles = (x) => {
  x.strokeStyle = "rgba(0,0,0,0.1)";
  x.strokeRect(0, 0, 128, 128);
  x.strokeRect(128, 128, 128, 128);
};

const std = (c, o = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
export const MAT = {
  beton: std("#ffffff", { map: grain("#c9c6c2", "0,0,0"), roughness: 0.45 }),
  moquette: std("#ffffff", {
    map: grain("#4b4f5c", "255,255,255"),
    roughness: 1,
  }),
  parquet: std("#ffffff", {
    map: grain("#b98a5e", "255,230,200", lames),
    roughness: 0.55,
  }),
  carrelage: std("#ffffff", {
    map: grain("#ecebe8", "0,0,0", dalles),
    roughness: 0.3,
  }),
  blanc: std("#f4f3f0", { roughness: 0.45 }),
  platre: std("#efece6", { roughness: 0.95 }),
  sombre: std("#1c1b22", { roughness: 0.9 }),
  bois: std("#8d5c3b", { roughness: 0.5 }),
  chene: std("#c49a6c", { roughness: 0.55 }),
  noir: std("#23252c", { roughness: 0.35, metalness: 0.5 }),
  alu: std("#c3c8cf", { roughness: 0.3, metalness: 0.8 }),
  tissu: std("#5d6472", { roughness: 1 }),
  velours: std("#7a1f86", { roughness: 1 }),
  cuir: std("#3b2a22", { roughness: 0.55 }),
  porte: std("#b08a64", { roughness: 0.5 }),
  verre: new THREE.MeshPhysicalMaterial({
    color: "#d6ecff",
    transparent: true,
    opacity: 0.16,
    roughness: 0.05,
  }),
  depoli: std("#ffffff", { transparent: true, opacity: 0.6, roughness: 0.9 }),
  feuille: std("#3d8b4d"),
  feuille2: std("#5aa35a"),
  pot: std("#e6e1d8"),
  potNoir: std("#2a2a2e"),
};

export function boite(parent, l, h, p, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function cylindre(parent, r, h, mat, x, y, z, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function etiquette(texte, couleur, classe = "zone") {
  const div = document.createElement("div");
  div.className = classe;
  div.textContent = texte;
  div.style.setProperty("--c", couleur);
  return new CSS2DObject(div);
}

export const sol = (scene, x0, x1, z0, z1, mat, y = 0.01) =>
  solForme(
    scene,
    [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1],
    ],
    mat,
    y,
  );

// Cloison de (x0, z0) à (x1, z1), droite ou en biais, avec des portes [début, fin] le long du mur.
// type : "plein" (mur blanc), "verre" (vitrage à cadre noir), "fenetre" (allège blanche et baie vitrée).
export function mur(
  scene,
  grille,
  x0,
  z0,
  x1,
  z1,
  { type = "verre", portes = [], h = 2.6 } = {},
) {
  const long = Math.hypot(x1 - x0, z1 - z0);
  const [dx, dz] = [(x1 - x0) / long, (z1 - z0) / long];
  const angle = Math.atan2(-dz, dx);
  const bornes = [0, ...portes.flat(), long];
  const piece = (l, hauteur, mat, a, y, ep = 0.12) => {
    const m = boite(scene, l, hauteur, ep, mat, x0 + dx * a, y, z0 + dz * a);
    m.rotation.y = angle;
    return m;
  };
  for (let k = 0; k < bornes.length; k += 2) {
    const [a, b] = [bornes[k], bornes[k + 1]];
    if (b - a < 0.05) continue;
    const c = (a + b) / 2;
    grille.segment(x0 + dx * a, z0 + dz * a, x0 + dx * b, z0 + dz * b, 0.25);
    if (type === "plein") {
      piece(b - a, h, MAT.platre, c, h / 2, 0.14);
      continue;
    }
    const allege = type === "fenetre" ? 0.8 : 0;
    if (allege) piece(b - a, allege, MAT.platre, c, allege / 2, 0.2);
    const v = piece(
      b - a,
      h - allege,
      MAT.verre,
      c,
      allege + (h - allege) / 2,
      0.04,
    );
    v.castShadow = false;
    piece(b - a, 0.07, MAT.noir, c, h, 0.08);
    if (!allege) piece(b - a, 0.05, MAT.noir, c, 0.025, 0.08);
    const pas = allege ? 1.6 : 1.2;
    for (let s = a + pas; s < b - 0.2; s += pas)
      piece(0.05, h - allege, MAT.noir, s, allege + (h - allege) / 2, 0.06);
  }
  for (const [a, b] of portes) {
    const g = new THREE.Group();
    g.position.set(x0 + dx * a, 0, z0 + dz * a);
    g.rotation.y = angle - 1.1;
    boite(g, b - a - 0.05, 2.1, 0.04, MAT.porte, (b - a) / 2, 1.05, 0);
    scene.add(g);
  }
}

// Sol d'un polygone [[x, z], ...].
export function solForme(scene, contour, mat, y = 0.01, repetition = 3) {
  const forme = new THREE.Shape(
    contour.map(([x, z]) => new THREE.Vector2(x, -z)),
  );
  const geo = new THREE.ShapeGeometry(forme);
  const m = new THREE.Mesh(geo, mat.clone());
  if (mat.map) {
    m.material.map = mat.map.clone();
    m.material.map.repeat.set(1 / repetition, 1 / repetition);
    m.material.map.needsUpdate = true;
  }
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

export function plante(scene, grille, x, z, t = 1, grande = false) {
  const pot = grande ? MAT.potNoir : MAT.pot;
  cylindre(scene, 0.22 * t, 0.45 * t, pot, x, 0.23 * t, z);
  const n = grande ? 6 : 3;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const f = new THREE.Mesh(
      new THREE.IcosahedronGeometry((grande ? 0.32 : 0.26) * t, 0),
      k % 2 ? MAT.feuille : MAT.feuille2,
    );
    const r = grande ? 0.18 : 0.1;
    f.position.set(
      x + Math.cos(a) * r * t,
      (0.6 + (grande ? k * 0.22 : k * 0.15)) * t,
      z + Math.sin(a) * r * t,
    );
    f.rotation.set(a, a * 2, 0);
    f.castShadow = true;
    scene.add(f);
  }
  grille.bloquer(x, z, 0.45 * t, 0.45 * t, 0.15);
}

export function chaise(parent, couleur, x, z, angle) {
  const c = new THREE.Group();
  c.position.set(x, 0, z);
  c.rotation.y = angle;
  parent.add(c);
  const m = std(couleur, { roughness: 0.9 });
  boite(c, 0.5, 0.08, 0.48, m, 0, 0.48, 0);
  boite(c, 0.48, 0.55, 0.07, m, 0, 0.82, 0.23);
  cylindre(c, 0.03, 0.42, MAT.noir, 0, 0.24, 0, 8);
  boite(c, 0.5, 0.03, 0.06, MAT.noir, 0, 0.03, 0);
  boite(c, 0.06, 0.03, 0.5, MAT.noir, 0, 0.03, 0);
}

export function ecran(couleur, l = 0.58, h = 0.34) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(l, h),
    new THREE.MeshStandardMaterial({
      color: "#0b0f18",
      emissive: new THREE.Color(couleur),
      emissiveIntensity: 0.04,
    }),
  );
}

const OBJETS = [
  (g) => cylindre(g, 0.045, 0.1, MAT.blanc, 0.6, 0.8, 0.05, 10),
  (g) => {
    boite(g, 0.18, 0.05, 0.12, MAT.noir, -0.55, 0.78, -0.05);
    boite(g, 0.16, 0.12, 0.04, MAT.noir, -0.55, 0.86, -0.05);
  },
  (g) => boite(g, 0.22, 0.05, 0.3, MAT.velours, 0.55, 0.78, -0.12),
  () => {},
];

// Bureau en bench : plateau, deux écrans, séparateur bas à la couleur du service.
export function poste(scene, grille, x, z, angle, couleur, separateur = true) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = angle;
  scene.add(g);
  boite(g, 1.6, 0.05, 0.8, MAT.blanc, 0, 0.74, 0);
  boite(g, 0.05, 0.72, 0.7, MAT.alu, -0.76, 0.36, 0);
  boite(g, 0.05, 0.72, 0.7, MAT.alu, 0.76, 0.36, 0);
  if (separateur)
    boite(g, 1.6, 0.42, 0.04, std(couleur, { roughness: 1 }), 0, 0.98, -0.4);
  const e = ecran(couleur);
  e.position.set(0.18, 1.08, -0.215);
  e.rotation.y = -0.15;
  g.add(e);
  boite(g, 0.6, 0.36, 0.03, MAT.noir, 0.18, 1.08, -0.235).rotation.y = -0.15;
  boite(g, 0.05, 0.25, 0.05, MAT.noir, 0.18, 0.88, -0.25);
  boite(g, 0.32, 0.02, 0.22, MAT.alu, -0.45, 0.78, 0.05);
  boite(g, 0.32, 0.2, 0.01, MAT.noir, -0.45, 0.88, -0.05).rotation.x = -0.4;
  boite(g, 0.42, 0.02, 0.13, MAT.blanc, 0.1, 0.78, 0.12);
  OBJETS[Math.floor(Math.random() * OBJETS.length)](g);
  chaise(g, couleur, 0, 0.7, 0);
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  grille.bloquer(x, z, 1.6 * c + 0.8 * s, 1.6 * s + 0.8 * c, 0.15);
  const place = new THREE.Vector3(
    x + 0.7 * Math.sin(angle),
    0,
    z + 0.7 * Math.cos(angle),
  );
  return { place, angle: angle + Math.PI, ecran: e };
}
