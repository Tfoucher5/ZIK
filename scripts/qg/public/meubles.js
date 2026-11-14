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

export function sol(scene, x0, x1, z0, z1, mat, y = 0.01) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(x1 - x0, z1 - z0),
    mat.clone(),
  );
  if (mat.map) {
    m.material.map = mat.map.clone();
    m.material.map.repeat.set((x1 - x0) / 3, (z1 - z0) / 3);
    m.material.map.needsUpdate = true;
  }
  m.rotation.x = -Math.PI / 2;
  m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

// Cloison alignée sur un axe, de (x0, z0) à (x1, z1), avec des ouvertures [début, fin] le long du mur.
export function mur(
  scene,
  grille,
  x0,
  z0,
  x1,
  z1,
  { type = "verre", portes = [], h = 2.8 } = {},
) {
  const long = Math.hypot(x1 - x0, z1 - z0);
  const dx = (x1 - x0) / long;
  const dz = (z1 - z0) / long;
  const bornes = [0, ...portes.flat(), long];
  for (let k = 0; k < bornes.length; k += 2) {
    const [a, b] = [bornes[k], bornes[k + 1]];
    if (b - a < 0.05) continue;
    const cx = x0 + (dx * (a + b)) / 2;
    const cz = z0 + (dz * (a + b)) / 2;
    const lx = Math.abs(dx) * (b - a) || 0.1;
    const lz = Math.abs(dz) * (b - a) || 0.1;
    grille.bloquer(cx, cz, lx, lz, 0.2);
    if (type === "plein") {
      boite(scene, lx, h, lz, MAT.platre, cx, h / 2, cz);
      continue;
    }
    const fenetre = type === "fenetre";
    const v = new THREE.Mesh(new THREE.BoxGeometry(lx, h, lz), MAT.verre);
    v.position.set(cx, h / 2, cz);
    scene.add(v);
    boite(scene, lx + 0.02, 0.06, lz + 0.02, MAT.noir, cx, h, cz);
    boite(
      scene,
      lx + 0.02,
      fenetre ? 0.5 : 0.05,
      lz + 0.02,
      fenetre ? MAT.platre : MAT.noir,
      cx,
      fenetre ? 0.25 : 0.025,
      cz,
    );
    if (!fenetre)
      boite(scene, lx + 0.01, 0.12, lz + 0.01, MAT.depoli, cx, 1.4, cz);
    const pas = fenetre ? 1.5 : 1.2;
    for (let s = a + pas; s < b - 0.15; s += pas)
      boite(scene, 0.05, h, 0.05, MAT.noir, x0 + dx * s, h / 2, z0 + dz * s);
  }
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

// Table de réunion, sièges des deux côtés, écran au mur. Renvoie sièges, écran et la place de l'animateur.
export function tableReunion(scene, grille, x, z, l, n, couleur, mural) {
  boite(scene, l, 0.06, 1.2, MAT.chene, x, 0.74, z);
  for (const dx of [-l / 2 + 0.3, l / 2 - 0.3])
    boite(scene, 0.08, 0.72, 0.9, MAT.noir, x + dx, 0.36, z);
  grille.bloquer(x, z, l, 1.2, 0.15);
  const sieges = [];
  const par = Math.ceil(n / 2);
  for (let k = 0; k < n; k++) {
    const cote = k < par ? -1 : 1;
    const sx = x - l / 2 + (l / par) * ((k % par) + 0.5);
    const sz = z + cote * 0.95;
    chaise(scene, couleur, sx, sz, cote < 0 ? Math.PI : 0);
    sieges.push({
      place: new THREE.Vector3(sx, 0, sz),
      angle: cote < 0 ? 0 : Math.PI,
    });
  }
  const e = ecran(couleur, 1.6, 0.9);
  e.position.set(mural.x, 1.45, mural.z);
  e.rotation.y = mural.angle;
  scene.add(e);
  const n2 = new THREE.Vector3(Math.sin(mural.angle), 0, Math.cos(mural.angle));
  return {
    sieges,
    ecran: e,
    debout: {
      place: e.position.clone().setY(0).addScaledVector(n2, 0.7),
      angle: mural.angle,
      debout: true,
    },
  };
}
