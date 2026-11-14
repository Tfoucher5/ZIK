import * as THREE from "three";
import { MAT, boite, cylindre, toile } from "./meubles.js";

export const ZIK = {
  magenta: "#c026d3",
  neon: "#ff00ff",
  nuit: "#14141f",
  or: "#fbbf24",
};
const EQUIPES = [
  "#FF4F9A",
  "#5BC0EB",
  "#F4E04D",
  "#3DDC84",
  "#8C7BFF",
  "#FF8C42",
  "#2EC4B6",
];
const POLICE = '"Barlow Condensed", "Arial Narrow", sans-serif';

function panneau(scene, l, h, x, y, z, angle, texture, lumineux = false) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(l, h),
    new THREE.MeshStandardMaterial({
      map: texture,
      emissiveMap: lumineux ? texture : null,
      emissive: lumineux ? "#ffffff" : "#000000",
      emissiveIntensity: lumineux ? 1.2 : 0,
      roughness: 0.6,
    }),
  );
  m.position.set(x, y, z);
  m.rotation.y = angle;
  scene.add(m);
  return m;
}

// Le mur du logo à l'accueil : ZIK en néon magenta sur fond nuit.
export function neonZik(scene, x, z, angle, l = 4) {
  const t = toile(1024, 512, (c, w, h) => {
    c.fillStyle = ZIK.nuit;
    c.fillRect(0, 0, w, h);
    c.font = `italic 900 300px ${POLICE}`;
    c.textAlign = "center";
    c.shadowColor = ZIK.neon;
    c.shadowBlur = 40;
    c.fillStyle = "#ffd9ff";
    c.fillText("ZIK", w / 2, 330);
    c.shadowBlur = 0;
    c.font = `700 56px ${POLICE}`;
    c.fillStyle = ZIK.neon;
    c.fillText("BLIND TEST  ·  ZIK SOIRÉE  ·  ZIK PRO", w / 2, 440);
  });
  panneau(scene, l, l / 2, x, 1.55, z, angle, t, true);
}

const AFFICHES = [
  (c, w, h) => {
    c.fillStyle = ZIK.nuit;
    c.fillRect(0, 0, w, h);
    for (let k = 0; k < 14; k++) {
      const v = 60 + Math.abs(Math.sin(k * 1.7)) * 260;
      c.fillStyle = EQUIPES[k % EQUIPES.length];
      c.fillRect(20 + k * 17, h - 90 - v, 12, v);
    }
    c.fillStyle = "#fff";
    c.font = `italic 900 64px ${POLICE}`;
    c.fillText("BLIND TEST", 22, h - 30);
  },
  (c, w, h) => {
    c.fillStyle = ZIK.magenta;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#111";
    c.beginPath();
    c.arc(w / 2, h / 2 - 30, 105, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = ZIK.or;
    c.beginPath();
    c.arc(w / 2, h / 2 - 30, 32, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#fff";
    c.font = `italic 900 54px ${POLICE}`;
    c.textAlign = "center";
    c.fillText("ZIK SOIRÉE", w / 2, h - 40);
  },
  (c, w, h) => {
    c.fillStyle = "#f7f5fa";
    c.fillRect(0, 0, w, h);
    c.fillStyle = ZIK.magenta;
    c.font = `italic 900 120px ${POLICE}`;
    c.fillText("3, 2, 1", 18, 170);
    c.fillStyle = "#0f172a";
    c.font = `800 60px ${POLICE}`;
    c.fillText("TROUVE LE", 22, 260);
    c.fillText("TITRE !", 22, 320);
  },
];

export function affiche(scene, x, y, z, angle, n) {
  boite(
    scene,
    0.86,
    1.16,
    0.03,
    MAT.noir,
    x - Math.sin(angle) * 0.02,
    y,
    z - Math.cos(angle) * 0.02,
  ).rotation.y = angle;
  panneau(
    scene,
    0.8,
    1.1,
    x,
    y,
    z,
    angle,
    toile(256, 352, AFFICHES[n % AFFICHES.length]),
  );
}

export function murVinyles(scene, x, z, angle, n = 8) {
  const g = new THREE.Group();
  g.position.set(x, 1.6, z);
  g.rotation.y = angle;
  scene.add(g);
  for (let k = 0; k < n; k++) {
    const d = cylindre(
      g,
      0.28,
      0.02,
      MAT.noir,
      (k % 4) * 0.7 - 1.05,
      Math.floor(k / 4) * 0.65 - 0.3,
      0.02,
      32,
    );
    d.rotation.x = Math.PI / 2;
    const r = cylindre(
      g,
      0.1,
      0.022,
      new THREE.MeshStandardMaterial({ color: EQUIPES[k % EQUIPES.length] }),
      (k % 4) * 0.7 - 1.05,
      Math.floor(k / 4) * 0.65 - 0.3,
      0.025,
      20,
    );
    r.rotation.x = Math.PI / 2;
  }
}

export function tapis(scene, x, z, l, p, couleur, opacite = 0.9) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(l, p),
    new THREE.MeshStandardMaterial({
      color: couleur,
      roughness: 1,
      transparent: opacite < 1,
      opacity: opacite,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.02, z);
  m.receiveShadow = true;
  scene.add(m);
}

// Meuble bas sous les fenêtres : livres, vinyles, plante.
export function credence(scene, grille, x, z, angle, l = 2.4) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = angle;
  scene.add(g);
  boite(g, l, 0.62, 0.42, MAT.chene, 0, 0.31, 0);
  for (let k = 0; k < 7; k++)
    boite(
      g,
      0.05,
      0.24 + (k % 3) * 0.03,
      0.18,
      new THREE.MeshStandardMaterial({ color: EQUIPES[(k * 3) % 7] }),
      -l / 2 + 0.25 + k * 0.07,
      0.75,
      0,
    );
  cylindre(g, 0.12, 0.26, MAT.pot, l / 2 - 0.3, 0.75, 0);
  const f = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.22, 0),
    MAT.feuille2,
  );
  f.position.set(l / 2 - 0.3, 1.02, 0);
  g.add(f);
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  grille.bloquer(x, z, l * c + 0.42 * s, l * s + 0.42 * c, 0.1);
}

// Juke-box ZIK du salon.
export function jukebox(scene, grille, x, z, angle) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = angle;
  scene.add(g);
  boite(g, 0.9, 1.3, 0.6, MAT.bois, 0, 0.65, 0);
  const arc = cylindre(
    g,
    0.45,
    0.6,
    new THREE.MeshStandardMaterial({
      color: ZIK.magenta,
      emissive: ZIK.neon,
      emissiveIntensity: 0.8,
    }),
    0,
    1.3,
    0,
    24,
  );
  arc.rotation.x = Math.PI / 2;
  boite(
    g,
    0.6,
    0.4,
    0.02,
    new THREE.MeshStandardMaterial({
      color: "#111",
      emissive: ZIK.or,
      emissiveIntensity: 0.4,
    }),
    0,
    0.85,
    0.31,
  );
  grille.bloquer(x, z, 1, 1, 0.1);
}
export function canape(scene, grille, x, z, angle, mat = MAT.velours, l = 2.2) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = angle;
  scene.add(g);
  boite(g, l, 0.42, 0.85, mat, 0, 0.21, 0);
  boite(g, l, 0.45, 0.2, mat, 0, 0.6, 0.33);
  boite(g, 0.2, 0.25, 0.85, mat, -l / 2 + 0.1, 0.55, 0);
  boite(g, 0.2, 0.25, 0.85, mat, l / 2 - 0.1, 0.55, 0);
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  grille.bloquer(x, z, l * c + 0.85 * s, l * s + 0.85 * c, 0.1);
  return {
    place: new THREE.Vector3(
      x - 0.15 * Math.sin(angle),
      0,
      z - 0.15 * Math.cos(angle),
    ),
    angle: angle + Math.PI,
  };
}
