// Mobilier du penthouse N7 (types p-* du plan) : aiguillé ici par mobilier.js.
import * as THREE from "three";
import {
  P,
  bloc,
  boule,
  plaque,
  pose,
  texture,
  tube,
} from "./penthouse3d-base.js";
import { HALL } from "./penthouse3d-hall.js";
import { TERRASSE } from "./penthouse3d-terrasse.js";
import { fauteuil, lueur, mat, tabouret } from "./mobilier-base.js";

const veines = (fond, veine, n) => (x, l, h) => {
  x.fillStyle = fond;
  x.fillRect(0, 0, l, h);
  x.strokeStyle = veine;
  for (let i = 0; i < n; i++) {
    x.lineWidth = 0.6 + (i % 4) * 0.7;
    x.globalAlpha = 0.35 + (i % 3) * 0.2;
    x.beginPath();
    let [px, py] = [((i * 97) % l) - 40, ((i * 53) % h) - 40];
    x.moveTo(px, py);
    for (let k = 0; k < 6; k++)
      x.lineTo(
        (px += 30 + ((i + k) % 5) * 18),
        (py += ((i * k) % 7) * 14 - 20),
      );
    x.stroke();
  }
  x.globalAlpha = 1;
};
const MARBRE = texture("marbre", 512, 512, veines("#0c0b0d", "#c9a227", 40));
MARBRE.wrapS = MARBRE.wrapT = THREE.RepeatWrapping;
const ONYX = texture("onyx", 256, 256, veines("#e8a33a", "#fff1c9", 30));
const marbres = new Map();
function marbre(l, q) {
  const k = `${l}x${q}`;
  if (!marbres.has(k)) {
    const t = MARBRE.clone();
    t.repeat.set(l / 3, q / 3);
    t.needsUpdate = true;
    marbres.set(k, mat("#ffffff", { map: t, roughness: 0.12, metalness: 0.3 }));
  }
  return marbres.get(k);
}
const TAPIS = mat("#ffffff", {
  roughness: 1,
  map: texture("tapis", 256, 256, (x) => {
    x.fillStyle = "#e9dfcf";
    x.fillRect(0, 0, 256, 256);
    x.strokeStyle = "#b8892c";
    x.lineWidth = 8;
    x.strokeRect(14, 14, 228, 228);
    x.lineWidth = 2;
    x.strokeRect(30, 30, 196, 196);
  }),
});
const EAU = texture("eau", 128, 256, (x) => {
  x.fillStyle = "#0a3550";
  x.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 60; i++) {
    x.fillStyle = `rgba(190,235,255,${0.15 + (i % 5) * 0.08})`;
    x.fillRect((i * 37) % 128, (i * 71) % 256, 1 + (i % 2), 30 + (i % 7) * 12);
  }
});
EAU.wrapS = EAU.wrapT = THREE.RepeatWrapping;
const ONYX_LUMIERE = new THREE.MeshStandardMaterial({
  map: ONYX,
  emissiveMap: ONYX,
  emissive: "#ffffff",
  emissiveIntensity: 0.9,
});

const SALONS = {
  "p-marbre": (g, { l, q }) =>
    (plaque(g, l, q, marbre(l, q), 0, 0.012, 0).rotation.x = -Math.PI / 2),
  "p-tapis": (g, { l, q }) => bloc(g, l, 0.02, q, TAPIS, 0, 0.022, 0),
  "p-enceinte": (g, { l, q }) => {
    bloc(g, q * 0.8, 1.3, l * 0.8, P.noyer, 0, 0.75, 0, true);
    for (const [y, r] of [
      [1.2, 0.06],
      [0.95, 0.1],
      [0.6, 0.12],
    ])
      tube(g, r, 0.02, P.noir, 0, y, (l * 0.8) / 2, 1, 20).rotation.x =
        Math.PI / 2;
    tube(g, 0.03, 0.1, P.or, 0, 0.05, 0);
  },
  "p-mezzanine": (g, { l, q }) => {
    const y = 3.3;
    bloc(g, l, 0.2, q, P.laque, 0, y, 0, true);
    bloc(g, l, 0.02, q, mat("#3a2a1d", { roughness: 0.4 }), 0, y + 0.11, 0);
    bloc(g, l, 1.1, 0.02, P.verre, 0, y + 0.66, q / 2);
    bloc(g, 0.02, 1.1, q, P.verre, l / 2, y + 0.66, 0);
    bloc(g, l, 0.04, 0.05, P.or, 0, y + 1.22, q / 2);
    bloc(g, l, 0.03, 0.03, P.lumiere, 0, y - 0.11, q / 2 - 0.05);
    const haut = new THREE.Group();
    haut.position.y = y + 0.1;
    g.add(haut);
    for (const x of [l * 0.15, l * 0.32])
      fauteuil(haut, x, -0.1, Math.PI, P.cuir);
  },
  "p-escalier-helico": (g, { r }) => {
    const n = 16;
    tube(g, 0.08, 3.4, P.or, 0, 1.7, 0);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = Math.PI / 2 + (i / n) * Math.PI * 2.1;
      const y = 0.21 * (i + 1);
      const marche = bloc(
        g,
        r - 0.1,
        0.05,
        0.36,
        P.laque,
        Math.cos(a) * r * 0.5,
        y,
        -Math.sin(a) * r * 0.5,
        true,
      );
      marche.rotation.y = a;
      pts.push(new THREE.Vector3(Math.cos(a) * r, y + 0.95, -Math.sin(a) * r));
    }
    g.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.025, 6),
        P.or,
      ),
    );
  },
  "p-mur-eau": (g, { l }, c) => {
    const h = c.hauteur - 0.2;
    bloc(g, l + 0.3, h + 0.2, 0.12, P.noir, 0, (h + 0.2) / 2, -0.04);
    const t = EAU.clone();
    t.repeat.set(l / 1.5, h / 3);
    t.needsUpdate = true;
    const nappe = plaque(
      g,
      l,
      h - 0.3,
      new THREE.MeshStandardMaterial({
        map: t,
        emissiveMap: t,
        emissive: "#9fe3ff",
        emissiveIntensity: 0.6,
        roughness: 0.05,
      }),
      0,
      h / 2 + 0.1,
      0.03,
    );
    c.anime((dt) => (nappe.material.map.offset.y += dt * 0.6));
    bloc(g, l + 0.3, 0.3, 0.45, P.noir, 0, 0.15, 0.2);
    bloc(g, l + 0.1, 0.02, 0.3, lueur("#3fb6e8", 0.8), 0, 0.31, 0.2);
  },
  "p-lustre-anneaux": (g, { r }, c) => {
    const h = c.hauteur;
    const anneaux = [1, 0.72, 0.45].map((k, i) => {
      const a = new THREE.Mesh(
        new THREE.TorusGeometry(r * k, 0.045, 8, 64),
        lueur("#ffe7c2", 2.4),
      );
      a.position.y = h - 1.3 - i * 0.45;
      a.rotation.x = Math.PI / 2 + (i - 1) * 0.12;
      g.add(a);
      return a;
    });
    for (let i = 0; i < 4; i++)
      bloc(
        g,
        0.008,
        1.3,
        0.008,
        P.or,
        Math.cos(i * 1.57) * r,
        h - 0.65,
        Math.sin(i * 1.57) * r,
      );
    const l = new THREE.PointLight("#ffe2b8", 10, 14, 1.4);
    l.position.y = h - 1.9;
    g.add(l);
    c.anime((dt) =>
      anneaux.forEach((a, i) => (a.rotation.z += dt * (i % 2 ? -0.1 : 0.1))),
    );
  },
  "p-bar-onyx": (g, { l, q }) => {
    bloc(g, l, 1.05, q, ONYX_LUMIERE, 0, 0.53, 0, true);
    bloc(g, l + 0.1, 0.05, q + 0.15, P.noir, 0, 1.08, 0);
    bloc(g, l, 0.03, 0.03, P.or, 0, 1.11, q / 2 + 0.07);
    for (const y of [1.6, 2.1]) {
      bloc(g, l, 0.03, 0.25, P.noir, 0, y, -q / 2 - 0.05);
      for (let x = -l / 2 + 0.15; x < l / 2; x += 0.2)
        tube(
          g,
          0.035,
          0.28,
          x % 0.6 > 0.2 ? P.or : mat("#2c4a2e", { roughness: 0.1 }),
          x,
          y + 0.16,
          -q / 2 - 0.05,
          1,
          8,
        );
    }
    for (let x = -l / 2 + 0.4; x < l / 2; x += 0.7)
      tabouret(g, x, q / 2 + 0.45);
  },
  "p-cave-vins": (g, { l, q }) => {
    const h = 2.6;
    bloc(g, l, h, q, P.noir, 0, h / 2, 0, true);
    bloc(g, l - 0.1, h - 0.1, 0.02, P.verre, 0, h / 2, q / 2 + 0.01);
    const bouteille = mat("#1f3b24", { roughness: 0.15 });
    for (let y = 0.3; y < h - 0.2; y += 0.28) {
      bloc(g, l - 0.15, 0.02, 0.02, P.lumiere, 0, y + 0.12, q / 2 - 0.04);
      for (let x = -l / 2 + 0.12; x < l / 2 - 0.05; x += 0.11)
        tube(g, 0.035, 0.3, bouteille, x, y, 0, 1, 8).rotation.x = Math.PI / 2;
    }
  },
  "p-cheminee": (g, { r }, c) => {
    const h = c.hauteur;
    tube(g, 0.1, h - 2, P.noir, 0, (h + 2) / 2, 0);
    tube(g, 0.12, 0.5, P.noir, 0, 1.75, 0, r / 0.12, 32);
    boule(g, r * 2, 0.6, r * 2, P.noir, 0, 1.3, 0);
    const feu = boule(
      g,
      r * 1.2,
      0.35,
      r * 1.2,
      lueur("#ff7a1a", 2.5),
      0,
      1.25,
      r * 0.45,
    );
    const l = new THREE.PointLight("#ff8a3d", 4, 7, 1.6);
    l.position.set(0, 1.2, r);
    g.add(l);
    c.anime((dt, t) => {
      const k = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 3.7);
      feu.scale.y = 0.35 * k;
      l.intensity = 4 * k;
    });
  },
  "p-piano": (g, { l, q }) => {
    tube(g, q / 2, 0.32, P.laque, l / 2 - q / 2, 0.86, 0, 1, 32);
    bloc(g, l - q / 2, 0.32, q, P.laque, -q / 4, 0.86, 0, true);
    const couvercle = bloc(
      g,
      l - 0.2,
      0.02,
      q * 0.95,
      P.laque,
      0.05,
      1.35,
      -q * 0.15,
    );
    couvercle.rotation.x = 0.6;
    bloc(g, 0.18, 0.04, q - 0.1, P.laque, -l / 2 - 0.05, 0.74, 0);
    bloc(g, 0.15, 0.02, q - 0.15, mat("#fafafa"), -l / 2 - 0.05, 0.77, 0);
    for (const [x, z] of [
      [-l / 2 + 0.15, q / 2 - 0.15],
      [-l / 2 + 0.15, -q / 2 + 0.15],
      [l / 2 - 0.2, 0],
    ])
      tube(g, 0.05, 0.7, P.laque, x, 0.35, z);
    bloc(g, 0.4, 0.48, 0.7, P.laque, -l / 2 - 0.45, 0.24, 0);
  },
};

const TYPES = { ...SALONS, ...HALL, ...TERRASSE };
const ORIENTES = new Set(["p-transat", "p-piscine"]);

export function penthouse3d(parent, m, c) {
  const { g, d } = pose(parent, m, c, !ORIENTES.has(m.type));
  const f = TYPES[m.type];
  if (!f) throw new Error(`Penthouse : type « ${m.type} » sans modèle 3D.`);
  return f(g, d, c, m);
}
