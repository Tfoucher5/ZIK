import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

function texture(fond, grain, motif) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = fond;
  x.fillRect(0, 0, 128, 128);
  for (let k = 0; k < 900; k++) {
    x.fillStyle = `rgba(${grain},${Math.random() * 0.08})`;
    x.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  motif?.(x);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const lames = (x) => {
  x.strokeStyle = "rgba(60,35,15,0.25)";
  for (let y = 0; y < 128; y += 16) {
    x.beginPath();
    x.moveTo(0, y);
    x.lineTo(128, y);
    x.stroke();
  }
};
const dalles = (x) => {
  x.strokeStyle = "rgba(0,0,0,0.12)";
  x.strokeRect(0, 0, 128, 128);
};

const std = (c, o = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
export const MAT = {
  moquette: std("#ffffff", {
    map: texture("#5d6573", "255,255,255"),
    roughness: 1,
  }),
  parquet: std("#ffffff", {
    map: texture("#a8774f", "255,230,200", lames),
    roughness: 0.6,
  }),
  carrelage: std("#ffffff", {
    map: texture("#d8d6d0", "0,0,0", dalles),
    roughness: 0.3,
  }),
  beton: std("#9a9ca1", { roughness: 0.9 }),
  blanc: std("#f2f2ef", { roughness: 0.5 }),
  platre: std("#e7e4de", { roughness: 0.95 }),
  bois: std("#8a5a3b", { roughness: 0.55 }),
  noir: std("#24272e", { roughness: 0.4, metalness: 0.5 }),
  alu: std("#b9c0c8", { roughness: 0.3, metalness: 0.8 }),
  tissu: std("#7d8796", { roughness: 1 }),
  cuir: std("#3a2b24", { roughness: 0.6 }),
  verre: new THREE.MeshPhysicalMaterial({
    color: "#bfe3ff",
    transparent: true,
    opacity: 0.18,
    roughness: 0.05,
    metalness: 0.1,
  }),
  depoli: std("#ffffff", { transparent: true, opacity: 0.55, roughness: 0.9 }),
  feuille: std("#3f8f4f"),
  table: std("#1f6f4a", { roughness: 0.6 }),
  pot: std("#d9d4ca"),
};

export function boite(parent, l, h, p, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), mat);
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

export function sol(scene, x0, x1, z0, z1, mat) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(x1 - x0, z1 - z0),
    mat.clone(),
  );
  m.material.map = mat.map?.clone();
  m.material.map?.repeat.set((x1 - x0) / 4, (z1 - z0) / 4);
  if (m.material.map) m.material.map.needsUpdate = true;
  m.rotation.x = -Math.PI / 2;
  m.position.set((x0 + x1) / 2, 0.01, (z0 + z1) / 2);
  m.receiveShadow = true;
  scene.add(m);
}

// Cloison entre (x0, z0) et (x1, z1), alignée sur un axe, avec des ouvertures [début, fin] le long du mur.
export function mur(
  scene,
  grille,
  x0,
  z0,
  x1,
  z1,
  { type = "verre", portes = [], h = 3 } = {},
) {
  const long = Math.hypot(x1 - x0, z1 - z0);
  const dx = (x1 - x0) / long;
  const dz = (z1 - z0) / long;
  const bornes = [0, ...portes.flat(), long];
  for (let k = 0; k < bornes.length; k += 2) {
    const a = bornes[k];
    const b = bornes[k + 1];
    if (b - a < 0.05) continue;
    const cx = x0 + (dx * (a + b)) / 2;
    const cz = z0 + (dz * (a + b)) / 2;
    const lx = Math.abs(dx) * (b - a) || 0.1;
    const lz = Math.abs(dz) * (b - a) || 0.1;
    grille.bloquer(cx, cz, lx, lz, 0.25);
    if (type === "plein") {
      boite(scene, lx, h, lz, MAT.platre, cx, h / 2, cz);
      continue;
    }
    const v = new THREE.Mesh(
      new THREE.BoxGeometry(lx, h, lz),
      type === "fenetre" ? MAT.verre : MAT.verre,
    );
    v.position.set(cx, h / 2, cz);
    scene.add(v);
    boite(scene, lx + 0.02, 0.08, lz + 0.02, MAT.alu, cx, h, cz);
    boite(
      scene,
      lx + 0.02,
      type === "fenetre" ? 0.45 : 0.06,
      lz + 0.02,
      type === "fenetre" ? MAT.platre : MAT.alu,
      cx,
      type === "fenetre" ? 0.22 : 0.03,
      cz,
    );
    if (type === "verre")
      boite(scene, lx + 0.01, 0.25, lz + 0.01, MAT.depoli, cx, 1.35, cz);
    const pas = type === "fenetre" ? 2 : 1.6;
    for (let s = a + pas; s < b - 0.2; s += pas)
      boite(scene, 0.07, h, 0.07, MAT.alu, x0 + dx * s, h / 2, z0 + dz * s);
  }
}

export function plante(scene, grille, x, z, t = 1) {
  boite(scene, 0.55 * t, 0.65 * t, 0.55 * t, MAT.pot, x, 0.33 * t, z);
  for (let k = 0; k < 3; k++) {
    const f = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.45 * t, 1),
      MAT.feuille,
    );
    f.position.set(
      x + (k - 1) * 0.2 * t,
      (1 + k * 0.35) * t,
      z + ((k % 2) - 0.5) * 0.2 * t,
    );
    f.castShadow = true;
    scene.add(f);
  }
  grille.bloquer(x, z, 0.55 * t, 0.55 * t);
}

export function chaise(parent, couleur, x, z, angle) {
  const c = new THREE.Group();
  c.position.set(x, 0, z);
  c.rotation.y = angle;
  parent.add(c);
  const m = std(couleur, { roughness: 0.9 });
  boite(c, 0.55, 0.09, 0.52, m, 0, 0.5, 0);
  boite(c, 0.52, 0.62, 0.08, m, 0, 0.88, 0.25);
  boite(c, 0.06, 0.45, 0.06, MAT.noir, 0, 0.25, 0);
  boite(c, 0.5, 0.04, 0.5, MAT.noir, 0, 0.04, 0);
}

export function ecran(couleur, l = 0.62, h = 0.36) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(l, h),
    new THREE.MeshStandardMaterial({
      color: "#0b0f18",
      emissive: new THREE.Color(couleur),
      emissiveIntensity: 0.05,
    }),
  );
}

// Poste en cubicle (cloisons basses en tissu sur trois côtés). Renvoie la place assise et l'écran.
export function poste(scene, grille, x, z, angle, couleur, cubicle = true) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = angle;
  scene.add(g);
  boite(g, 1.7, 0.06, 0.8, MAT.blanc, 0, 0.74, 0);
  boite(g, 0.06, 0.72, 0.7, MAT.alu, -0.8, 0.37, 0);
  boite(g, 0.06, 0.72, 0.7, MAT.alu, 0.8, 0.37, 0);
  boite(g, 0.05, 0.25, 0.05, MAT.noir, 0, 0.9, -0.22);
  boite(g, 0.66, 0.4, 0.04, MAT.noir, 0, 1.18, -0.25);
  const e = ecran(couleur);
  e.position.set(0, 1.18, -0.225);
  g.add(e);
  boite(g, 0.45, 0.03, 0.15, MAT.noir, 0, 0.78, 0.08);
  boite(g, 0.25, 0.08, 0.3, MAT.blanc, 0.55, 0.81, -0.1);
  if (cubicle) {
    const t = std(couleur, { roughness: 1 });
    boite(g, 2, 1.25, 0.06, MAT.tissu, 0, 0.63, -0.45);
    boite(g, 0.06, 1.25, 1.7, MAT.tissu, -1, 0.63, 0.35);
    boite(g, 2, 0.05, 0.08, t, 0, 1.27, -0.45);
  }
  chaise(g, couleur, 0, 0.75, 0);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  grille.bloquer(
    x,
    z,
    Math.abs(1.9 * cos) + Math.abs(0.9 * sin),
    Math.abs(1.9 * sin) + Math.abs(0.9 * cos),
    0.2,
  );
  const place = new THREE.Vector3(0.75 * sin + x, 0, 0.75 * cos + z);
  return { place, angle: angle + Math.PI, ecran: e };
}

// Table de réunion avec sièges des deux côtés et un écran au mur. Renvoie les sièges et l'écran.
export function tableReunion(scene, grille, x, z, l, n, couleur, mural) {
  boite(scene, l, 0.08, 1.6, MAT.bois, x, 0.76, z);
  boite(scene, 0.3, 0.72, 0.9, MAT.noir, x - l / 3, 0.36, z);
  boite(scene, 0.3, 0.72, 0.9, MAT.noir, x + l / 3, 0.36, z);
  grille.bloquer(x, z, l, 1.6, 0.2);
  const sieges = [];
  const par = Math.ceil(n / 2);
  for (let k = 0; k < n; k++) {
    const cote = k < par ? -1 : 1;
    const sx = x - l / 2 + (l / par) * ((k % par) + 0.5);
    const sz = z + cote * 1.15;
    chaise(scene, couleur, sx, sz, cote < 0 ? Math.PI : 0);
    sieges.push({
      place: new THREE.Vector3(sx, 0, sz),
      angle: cote < 0 ? 0 : Math.PI,
    });
  }
  const e = ecran(couleur, 2.4, 1.3);
  e.position.set(mural.x, 1.6, mural.z);
  e.rotation.y = mural.angle;
  scene.add(e);
  return {
    sieges,
    ecran: e,
    debout: {
      place: new THREE.Vector3(
        mural.x + Math.sin(mural.angle) * 0.9,
        0,
        mural.z + Math.cos(mural.angle) * 0.9,
      ),
      angle: mural.angle,
      debout: true,
    },
  };
}
