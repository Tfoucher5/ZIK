import * as THREE from "three";
import { MAT, boite, cylindre, plante, toile } from "./meubles.js";
import { canape, tapis } from "./deco.js";
import { OBSTACLES } from "./penthouse-plan.js";
import {
  MAGENTA,
  POLICE,
  RIEN,
  lettresZik,
  lumineux,
} from "./penthouse-terrasse.js";

const std = (c, o = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
const OR = std("#e0b02a", {
  roughness: 0.3,
  metalness: 0.6,
  emissive: "#8a5a00",
  emissiveIntensity: 0.6,
});
const LAQUE = std("#141219", { roughness: 0.25, metalness: 0.3 });
const MARBRE = std("#1b1b22", { roughness: 0.12, metalness: 0.2 });

function pose(parent, x, z, angle = 0, y = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = angle;
  parent.add(g);
  return g;
}

function coupe(g, x, y) {
  boite(g, 0.14, 0.04, 0.14, LAQUE, x, y + 0.02, 0);
  cylindre(g, 0.02, 0.1, OR, x, y + 0.09, 0, 8);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.04, 0.16, 16), OR);
  c.position.set(x, y + 0.22, 0);
  g.add(c);
}

// Mur des disques d'or, logo ZIK néon et vitrine à trophées, côté ouest.
function honneurs(groupe) {
  for (let k = 0; k < 8; k++) {
    const g = pose(
      groupe,
      2.09,
      -9.1 + (k % 4) * 1.05,
      Math.PI / 2,
      k < 4 ? 2.3 : 1.25,
    );
    boite(g, 0.82, 0.82, 0.04, MAT.noir, 0, 0, 0);
    boite(g, 0.74, 0.74, 0.01, std("#0c0b10", { roughness: 1 }), 0, 0, 0.025);
    const d = cylindre(g, 0.27, 0.012, OR, -0.04, 0.03, 0.035, 40);
    d.rotation.x = Math.PI / 2;
    const r = cylindre(
      g,
      0.07,
      0.014,
      lumineux(MAGENTA, 1.5),
      -0.04,
      0.03,
      0.037,
      20,
    );
    r.rotation.x = Math.PI / 2;
    boite(g, 0.16, 0.05, 0.01, OR, 0.24, -0.3, 0.03);
  }
  for (const y of [2.82, 1.77])
    boite(groupe, 0.06, 0.03, 4.2, lumineux("#ffd28a", 1.6), 2.15, y, -7.53);

  boite(
    groupe,
    0.03,
    1.9,
    3.6,
    std("#0d0d14", { roughness: 0.9 }),
    2.09,
    1.95,
    -2.8,
  );
  const logo = lumineux(MAGENTA, 2.2);
  const l = lettresZik(groupe, 1.3, logo, 0.08);
  l.position.set(2.1, 1.3, -2.8);
  l.rotation.y = Math.PI / 2;

  const v = pose(groupe, OBSTACLES.vitrine[0], OBSTACLES.vitrine[1], Math.PI);
  boite(v, 2.2, 0.3, 0.5, LAQUE, 0, 0.15, 0);
  const vitre = boite(v, 2.2, 1.7, 0.5, MAT.verre, 0, 1.15, 0);
  vitre.castShadow = false;
  boite(v, 2.24, 0.08, 0.52, LAQUE, 0, 2.04, 0);
  boite(v, 2.1, 0.02, 0.4, lumineux("#fff4d6", 1.8), 0, 1.99, 0);
  for (const y of [0.3, 0.95, 1.5]) {
    boite(v, 2.1, 0.02, 0.44, MAT.verre, 0, y, 0);
    for (const x of [-0.7, 0, 0.7]) coupe(v, x + (y === 0.95 ? 0.35 : 0), y);
  }
  return logo;
}

// Salon : canapé en L velours, table basse, tapis, platine vinyle.
function salon(groupe) {
  const [cx, cz, cl] = OBSTACLES.canape;
  tapis(groupe, 11.1, 2, 4.2, 3.2, "#2a1b3d");
  canape(groupe, RIEN, cx, cz, 0, MAT.velours, cl);
  canape(
    groupe,
    RIEN,
    ...OBSTACLES.canapeCote.slice(0, 2),
    -Math.PI / 2,
    MAT.velours,
    1.8,
  );
  boite(groupe, 0.85, 0.42, 0.85, MAT.velours, 9.45, 0.21, 3.05);
  boite(groupe, 0.85, 0.45, 0.2, MAT.velours, 9.45, 0.6, 3.38);
  boite(groupe, 0.2, 0.45, 0.85, MAT.velours, 9.12, 0.6, 3.05);
  const [tx, tz] = OBSTACLES.tableBasse;
  boite(groupe, 1.4, 0.06, 0.8, MARBRE, tx, 0.36, tz);
  boite(groupe, 1.3, 0.3, 0.7, OR, tx, 0.17, tz);
  cylindre(groupe, 0.12, 0.05, OR, tx - 0.3, 0.42, tz);
  cylindre(groupe, 0.04, 0.1, lumineux("#ffb347", 2), tx + 0.35, 0.44, tz, 10);

  const [px, pz] = OBSTACLES.platine;
  const p = pose(groupe, px, pz);
  boite(p, 1.4, 0.9, 0.6, LAQUE, 0, 0.45, 0);
  boite(p, 1.42, 0.03, 0.02, lumineux(MAGENTA, 2), 0, 0.85, -0.31);
  boite(p, 0.24, 0.06, 0.4, MAT.noir, 0, 0.93, 0);
  const plateaux = [-0.42, 0.42].map((x) => {
    const d = cylindre(
      p,
      0.22,
      0.02,
      std("#0a0a0a", { roughness: 0.3 }),
      x,
      0.93,
      0,
      32,
    );
    cylindre(d, 0.07, 0.025, OR, 0, 0, 0, 16);
    boite(d, 0.03, 0.03, 0.1, lumineux("#ffffff", 1.5), 0.17, 0.005, 0);
    boite(p, 0.03, 0.03, 0.3, MAT.alu, x + 0.22, 0.96, 0.05).rotation.y = 0.3;
    return d;
  });
  return plateaux;
}

// Bar aux bouteilles lumineuses devant la baie est, aquarium mural qui le sépare du bureau.
function bar(groupe) {
  const [bx, bz] = OBSTACLES.comptoir;
  boite(groupe, 0.6, 1.05, 3, LAQUE, bx, 0.52, bz);
  boite(groupe, 0.72, 0.05, 3.1, MARBRE, bx, 1.07, bz);
  boite(groupe, 0.02, 0.03, 3, lumineux(MAGENTA, 2.2), bx - 0.31, 0.1, bz);
  boite(groupe, 0.02, 0.02, 3.1, OR, bx - 0.36, 1.05, bz);
  for (const dz of [-0.8, 0.8]) {
    cylindre(groupe, 0.2, 0.06, MAT.cuir, bx - 0.6, 0.75, bz + dz);
    cylindre(groupe, 0.03, 0.72, OR, bx - 0.6, 0.36, bz + dz, 8);
  }
  const [ex, ez] = OBSTACLES.etagere;
  boite(groupe, 0.4, 2.3, 0.05, LAQUE, ex, 1.15, ez - 1.6);
  boite(groupe, 0.4, 2.3, 0.05, LAQUE, ex, 1.15, ez + 1.6);
  const couleurs = ["#ffb347", "#ff2d95", "#5bc0eb", "#3ddc84", "#f4e04d"];
  for (const [n, y] of [0.6, 1.2, 1.8].entries()) {
    boite(groupe, 0.4, 0.03, 3.2, MAT.verre, ex, y, ez);
    boite(
      groupe,
      0.02,
      0.02,
      3.1,
      lumineux("#fff4d6", 1.6),
      ex - 0.18,
      y - 0.03,
      ez,
    );
    for (let k = 0; k < 9; k++) {
      const h = 0.25 + ((k + n) % 3) * 0.05;
      const m = lumineux(couleurs[(k + n * 2) % couleurs.length], 1.6, {
        transparent: true,
        opacity: 0.85,
      });
      cylindre(
        groupe,
        0.045,
        h,
        m,
        ex,
        y + h / 2 + 0.015,
        ez - 1.4 + k * 0.35,
        10,
      );
    }
  }

  const [ax, az, al] = OBSTACLES.aquarium;
  boite(groupe, al, 0.6, 0.5, LAQUE, ax, 0.3, az);
  const eau = boite(
    groupe,
    al - 0.06,
    1.3,
    0.44,
    lumineux("#0ea5e9", 1.5, { transparent: true, opacity: 0.55 }),
    ax,
    1.27,
    az,
  );
  eau.castShadow = false;
  boite(groupe, al, 0.05, 0.5, LAQUE, ax, 1.95, az);
  boite(groupe, al - 0.1, 0.08, 0.42, std("#d9c38a"), ax, 0.66, az);
  for (let k = 0; k < 5; k++) {
    const a = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.4 + (k % 2) * 0.25, 5),
      MAT.feuille2,
    );
    a.position.set(ax - 1.1 + k * 0.55, 0.9, az + (k % 2 ? 0.1 : -0.1));
    groupe.add(a);
  }
  const poissons = [];
  for (let k = 0; k < 9; k++) {
    const f = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.13, 4),
      lumineux(["#ff8c42", "#f4e04d", "#ff4f9a"][k % 3], 1.6),
    );
    f.rotation.z = Math.PI / 2;
    f.position.set(ax, 0.85 + (k % 5) * 0.2, az - 0.12 + (k % 3) * 0.12);
    groupe.add(f);
    poissons.push({ f, v: 0.25 + (k % 4) * 0.08, phase: k * 1.9 });
  }
  return { poissons, ax, al };
}

// Ascenseur privé à porte dorée, plaque du fondateur au-dessus.
function ascenseur(groupe) {
  const [x, z, l, p] = OBSTACLES.ascenseur;
  boite(groupe, l, 3.2, p, std("#17151c", { roughness: 0.4 }), x, 1.6, z);
  const face = x + l / 2 + 0.02;
  for (const dz of [-0.28, 0.28])
    boite(groupe, 0.03, 2.3, 0.54, MAT.or, face, 1.15, z + dz);
  for (const dz of [-0.6, 0.6])
    boite(groupe, 0.04, 2.4, 0.04, lumineux("#ffd28a", 1.6), face, 1.2, z + dz);
  boite(groupe, 0.04, 0.12, 0.08, lumineux(MAGENTA, 2), face, 1.2, z + 0.85);
  const plaque = toile(512, 128, (c, w, h) => {
    const d = c.createLinearGradient(0, 0, w, h);
    d.addColorStop(0, "#f6d77a");
    d.addColorStop(1, "#a8761c");
    c.fillStyle = d;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#1a1206";
    c.font = `800 54px ${POLICE}`;
    c.textAlign = "center";
    c.fillText("THÉO · FONDATEUR", w / 2, 84);
  });
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 0.32),
    std("#ffffff", {
      map: plaque,
      emissive: "#ffffff",
      emissiveMap: plaque,
      emissiveIntensity: 1.5,
      metalness: 0.4,
    }),
  );
  m.position.set(face + 0.01, 2.7, z);
  m.rotation.y = Math.PI / 2;
  groupe.add(m);
}

export function decor(groupe) {
  ascenseur(groupe);
  const logo = honneurs(groupe);
  const plateaux = salon(groupe);
  const aqua = bar(groupe);
  for (const [id, t] of [
    ["plante1", 1.4],
    ["plante2", 1.2],
    ["plante3", 1.1],
  ])
    plante(groupe, RIEN, OBSTACLES[id][0], OBSTACLES[id][1], t, true);

  return (dt, t) => {
    logo.emissiveIntensity = 2 + Math.sin(t * 1.5) * 0.4;
    for (const d of plateaux) d.rotation.y -= dt * 3.5;
    for (const { f, v, phase } of aqua.poissons) {
      const s = Math.sin(t * v + phase);
      f.position.x = aqua.ax + s * (aqua.al / 2 - 0.2);
      f.rotation.y = Math.cos(t * v + phase) > 0 ? Math.PI : 0;
    }
  };
}
