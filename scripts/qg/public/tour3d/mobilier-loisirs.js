import * as THREE from "three";
import { MAT, boite, cylindre } from "../meubles.js";
import { versLocal } from "./repere.js";
import {
  M,
  MAGENTA,
  fauteuil,
  groupe,
  lueur,
  mat,
  moniteur,
  pied,
} from "./mobilier-base.js";

const tapisMat = mat("#7c8b6f", { roughness: 1 });
const feutreVert = mat("#1f6b3a", { roughness: 1 });

function cadre(g, l, p, h, m = MAT.noir) {
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      pied(g, sx * (l / 2 - 0.06), sz * (p / 2 - 0.06), h, m);
}

export const LOISIRS = {
  scene: (g, l, p, c) => {
    boite(g, l, 0.6, p, MAT.noir, 0, 0.3, 0);
    boite(g, l, 0.02, p, MAT.parquet, 0, 0.61, 0);
    for (const s of [-1, 1])
      boite(g, 0.5, 1.4, 0.45, MAT.noir, s * (l / 2 - 0.35), 1.3, -p / 2 + 0.3);
    pied(g, 0, 0.3, 1.5).position.y = 1.35;
    const t = boite(
      g,
      l,
      0.12,
      0.12,
      MAT.alu,
      0,
      Math.min(c.hauteur - 0.2, 3.2),
      -p / 2 + 0.1,
    );
    for (let x = -l / 2 + 0.5; x < l / 2; x += 1) {
      const s = cylindre(
        g,
        0.09,
        0.22,
        lueur("#fff1c1", 2),
        x,
        t.position.y - 0.15,
        -p / 2 + 0.1,
        8,
      );
      s.rotation.x = 0.6;
    }
  },
  regie: (g, l, p) => {
    boite(g, l, 0.85, p, MAT.noir, 0, 0.43, 0);
    boite(g, l - 0.1, 0.04, p - 0.2, M.anthracite, 0, 0.88, 0).rotation.x =
      -0.15;
    for (let x = -l / 2 + 0.15; x < l / 2 - 0.1; x += 0.12)
      boite(g, 0.03, 0.02, 0.18, M.bleuLed, x, 0.92, 0);
    moniteur(g, 0, 1.25, -p / 2 + 0.1, Math.min(0.9, l * 0.6), 0.4);
    fauteuil(g, 0, p / 2 + 0.35);
  },
  console: (g, l, p) => {
    LOISIRS.regie(g, l, p);
    moniteur(g, -l / 2 + 0.35, 1.2, -p / 2 + 0.1, 0.5, 0.3, "#e5e7eb", 0.3);
    moniteur(g, l / 2 - 0.35, 1.2, -p / 2 + 0.1, 0.5, 0.3, "#e5e7eb", -0.3);
  },
  borne: (g, l, p, c) => {
    boite(g, l, 1.7, p, MAT.noir, 0, 0.85, 0);
    boite(g, l, 0.2, 0.05, lueur(MAGENTA, 1.4), 0, 1.75, p / 2);
    boite(g, l, 0.12, 0.3, M.anthracite, 0, 1, p / 2 + 0.1);
    const e = moniteur(
      g,
      0,
      1.35,
      p / 2 + 0.01,
      l * 0.8,
      0.45,
      c.zik ? MAGENTA : "#5bc0eb",
    );
    e.material.emissiveIntensity = 0.9;
  },
  billard: (g, l, p) => {
    boite(g, l, 0.12, p, M.noyer, 0, 0.72, 0);
    boite(g, l - 0.2, 0.02, p - 0.2, feutreVert, 0, 0.79, 0);
    boite(g, l * 0.7, 0.6, p * 0.6, M.noyer, 0, 0.35, 0);
    const l1 = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.25, 16, 1, true),
      MAT.noir,
    );
    l1.position.set(0, 1.9, 0);
    g.add(l1);
  },
  "baby-foot": (g, l, p) => {
    boite(g, l, 0.3, p, MAT.chene, 0, 0.75, 0);
    boite(g, l - 0.1, 0.02, p - 0.1, feutreVert, 0, 0.7, 0);
    cadre(g, l, p, 0.6);
    for (let x = -l / 2 + 0.15; x < l / 2; x += 0.17)
      cylindre(g, 0.012, p + 0.4, MAT.alu, x, 0.82, 0, 6).rotation.x =
        Math.PI / 2;
  },
  "ping-pong": (g, l, p) => {
    boite(g, l, 0.04, p, M.bleu, 0, 0.76, 0);
    boite(g, 0.02, 0.15, p + 0.1, MAT.blanc, 0, 0.85, 0);
    boite(g, l, 0.005, 0.02, MAT.blanc, 0, 0.785, 0);
    cadre(g, l, p, 0.74);
  },
  "tapis-de-course": (g, l, p) => {
    boite(g, l, 0.18, p * 0.8, MAT.noir, 0, 0.12, 0);
    boite(g, l - 0.3, 0.02, p * 0.55, M.caoutchouc, 0, 0.22, 0);
    for (const s of [-1, 1])
      boite(g, 0.05, 1.2, 0.05, MAT.alu, l / 2 - 0.25, 0.7, (s * p) / 3);
    moniteur(g, l / 2 - 0.2, 1.35, 0, 0.3, 0.2, "#5bc0eb", -Math.PI / 2);
  },
  rameur: (g, l) => {
    boite(g, l, 0.08, 0.15, MAT.alu, 0, 0.3, 0);
    boite(g, 0.35, 0.06, 0.3, M.anthracite, 0, 0.38, 0);
    cylindre(g, 0.3, 0.12, MAT.noir, l / 2 - 0.2, 0.45, 0, 20).rotation.x =
      Math.PI / 2;
  },
  "banc-de-musculation": (g, l, p) => {
    boite(g, l * 0.7, 0.1, 0.3, M.anthracite, 0, 0.45, 0);
    boite(g, 0.08, 0.45, 0.08, MAT.noir, 0, 0.22, 0);
    for (const s of [-1, 1]) pied(g, -l / 2 + 0.2, (s * p) / 2.4, 1.3);
    cylindre(g, 0.015, p * 1.1, MAT.alu, -l / 2 + 0.2, 1.25, 0, 6).rotation.x =
      Math.PI / 2;
    for (const s of [-1, 1])
      cylindre(
        g,
        0.2,
        0.05,
        MAT.noir,
        -l / 2 + 0.2,
        1.25,
        s * p * 0.5,
        16,
      ).rotation.x = Math.PI / 2;
  },
  ring: (g, l, p) => {
    boite(g, l, 0.5, p, MAT.noir, 0, 0.25, 0);
    boite(g, l - 0.3, 0.04, p - 0.3, M.bleu, 0, 0.52, 0);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        cylindre(
          g,
          0.06,
          1.5,
          M.rouge,
          sx * (l / 2 - 0.15),
          1.05,
          sz * (p / 2 - 0.15),
          8,
        );
    for (const y of [0.9, 1.2, 1.5]) {
      for (const s of [-1, 1]) {
        boite(g, l - 0.3, 0.03, 0.03, MAT.blanc, 0, y, s * (p / 2 - 0.15));
        boite(g, 0.03, 0.03, p - 0.3, MAT.blanc, s * (l / 2 - 0.15), y, 0);
      }
    }
  },
  tapis: (g, l, p) => boite(g, l, 0.02, p, tapisMat, 0, 0.02, 0),
  nacelle: (g, l, p) => {
    const coque = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      M.lin,
    );
    coque.scale.set(l / 1, 0.7, p);
    coque.rotation.x = Math.PI;
    coque.position.y = 0.75;
    g.add(coque);
    boite(
      g,
      l * 0.8,
      0.08,
      p * 0.7,
      mat("#a5b4c8", { roughness: 1 }),
      0,
      0.5,
      0,
    );
    pied(g, 0, 0, 0.4, MAT.alu);
  },
  "table-de-massage": (g, l, p) => {
    boite(g, l, 0.1, p, MAT.blanc, 0, 0.72, 0);
    cadre(g, l, p, 0.68, MAT.chene);
  },
  "rang-de-sieges": (g, l, p) => {
    const n = Math.max(1, Math.floor(l / 0.55));
    for (let i = 0; i < n; i++) {
      const x = -l / 2 + (i + 0.5) * (l / n);
      boite(g, 0.48, 0.08, p * 0.8, M.rouge, x, 0.45, 0);
      boite(g, 0.48, 0.5, 0.08, M.rouge, x, 0.75, p / 2 - 0.04);
    }
    boite(g, l, 0.05, 0.05, MAT.noir, 0, 0.42, 0);
  },
  "boite-acoustique": (g, l, p, c) => {
    const h = Math.min(c.hauteur - 0.3, 2.8);
    for (const [x, z, a, b] of [
      [0, -p / 2, l, 0.12],
      [-l / 2, 0, 0.12, p],
      [l / 2, 0, 0.12, p],
    ])
      boite(g, a, h, b, M.feutre, x, h / 2, z);
    boite(g, l * 0.4, h, 0.06, MAT.verre, -l / 4, h / 2, p / 2);
    for (let x = -l / 2 + 0.6; x < l / 2; x += 0.8)
      boite(g, 0.6, 0.6, 0.06, M.anthracite, x, 1.5, -p / 2 + 0.1);
    pied(g, 0, 0, 1.5);
    cylindre(g, 0.05, 0.15, MAT.noir, 0, 1.55, 0, 8);
  },
};

export const POINTS_LOISIRS = {
  "medecine-ball": (g, r) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), M.caoutchouc);
    b.position.y = r;
    g.add(b);
  },
  // Le groupe est tourné par sens.js : la face lumineuse (-z local) vise l'écran du plateau.
  projecteur: (g) => {
    pied(g, 0, 0, 1.6);
    boite(g, 0.6, 0.6, 0.3, MAT.noir, 0, 1.8, 0);
    boite(g, 0.56, 0.56, 0.02, lueur("#fffaf0", 2), 0, 1.8, -0.16);
  },
  "disque-or": (g, r) => {
    boite(g, r * 2.6, r * 2.6, 0.05, MAT.noir, 0, 1.6, 0);
    cylindre(g, r, 0.02, MAT.or, 0, 1.6, 0.04, 32).rotation.x = Math.PI / 2;
  },
};

export const TRACES_LOISIRS = {
  "rail-camera": (parent, d) => {
    const [[, x1, y1], [, kx, ky, x2, y2]] = d;
    const a = versLocal(x1, y1);
    const b = versLocal(x2, y2);
    const q = versLocal(kx, ky);
    const k = new THREE.Vector3(q.x, 0.03, q.z);
    const courbe = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(a.x, 0.03, a.z),
      k,
      new THREE.Vector3(b.x, 0.03, b.z),
    );
    parent.add(
      new THREE.Mesh(new THREE.TubeGeometry(courbe, 24, 0.03, 6), MAT.alu),
    );
    const g = groupe(parent, k.x - 0.4, k.z + 0.4);
    pied(g, 0, 0, 1.4);
    boite(g, 0.25, 0.2, 0.35, MAT.noir, 0, 1.5, 0);
  },
};
