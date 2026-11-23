import * as THREE from "three";
import { MAT, boite, chaise, cylindre } from "../meubles.js";
import { versLocal } from "./repere.js";
import { M, MAGENTA, NEUTRE, mat, moniteur, pied } from "./mobilier-base.js";

const marquage = mat("#f4c430", { roughness: 0.8 });
const feuillages = [
  mat("#3d7a3f", { roughness: 0.9 }),
  mat("#4f9446", { roughness: 0.9 }),
  mat("#2e6233", { roughness: 0.9 }),
];

export const TECHNIQUE = {
  rack: (g, l, p, c) => {
    const n = Math.max(1, Math.round(l / 0.6));
    for (let i = 0; i < n; i++) {
      const x = -l / 2 + (i + 0.5) * (l / n);
      boite(g, l / n - 0.03, 2.1, p, MAT.noir, x, 1.05, 0);
      for (let y = 0.25; y < 2; y += 0.12) {
        const led = boite(
          g,
          0.04,
          0.02,
          0.01,
          Math.random() < 0.7 ? M.led : M.bleuLed,
          x - 0.15 + Math.random() * 0.3,
          y,
          p / 2 + 0.01,
        );
        c.anime(
          (dt, t) => (led.visible = Math.sin(t * (3 + y * 7) + x * 11) > -0.6),
        );
      }
    }
  },
  equipement: (g, l, p) => {
    boite(g, l, 1.8, p, M.gris, 0, 0.9, 0);
    for (let x = -l / 2 + 0.6; x < l / 2; x += 1.2)
      cylindre(g, 0.35, 0.06, M.anthracite, x, 1.83, 0, 20);
    cylindre(g, 0.08, l, MAT.alu, 0, 2.2, -p / 2 + 0.2, 8).rotation.z =
      Math.PI / 2;
    boite(g, 0.3, 0.2, 0.02, M.led, l / 2 - 0.3, 1.4, p / 2 + 0.01);
  },
  cuve: (g, l, p) => {
    boite(g, l, 1.6, p, mat("#7e8a96", { metalness: 0.4 }), 0, 0.8, 0);
    boite(g, l - 0.2, 0.02, p - 0.2, M.eau, 0, 1.61, 0);
  },
  bac: (g, l, p) => {
    boite(g, l, 1.1, p, M.vert, 0, 0.55, 0);
    boite(g, l + 0.04, 0.06, p + 0.04, MAT.noir, 0, 1.12, 0);
  },
  "aire-de-dechargement": (g, l, p) => {
    for (const s of [-1, 1]) {
      boite(g, l, 0.01, 0.1, marquage, 0, 0.02, s * (p / 2 - 0.05));
      boite(g, 0.1, 0.01, p, marquage, s * (l / 2 - 0.05), 0.02, 0);
    }
    boite(g, 1.2, 0.15, 0.8, MAT.chene, 0, 0.08, 0);
    boite(g, 1, 0.7, 0.7, mat("#b08a5a"), 0, 0.5, 0);
  },
  escalier: (g, l, p) => {
    const n = Math.max(3, Math.round(l / 0.3));
    for (let i = 0; i < n; i++)
      boite(
        g,
        l / n,
        0.17 * (i + 1),
        p,
        MAT.beton,
        -l / 2 + (i + 0.5) * (l / n),
        0.085 * (i + 1),
        0,
      );
  },
  plateforme: (g, l, p) => boite(g, l, 0.3, p, MAT.beton, 0, 0.15, 0),
};

function cime(g, r, y) {
  for (let k = 0; k < 4; k++) {
    const a = k * 1.7;
    const b = new THREE.Mesh(
      new THREE.IcosahedronGeometry(r * (0.6 + (k % 2) * 0.2), 1),
      feuillages[k % 3],
    );
    b.position.set(
      Math.cos(a) * r * 0.35,
      y + (k % 3) * r * 0.25,
      Math.sin(a) * r * 0.35,
    );
    b.castShadow = true;
    g.add(b);
  }
}

export const POINTS = {
  arbre: (g, r, c) => {
    const h = Math.min(
      Math.max(2.4, r * 2.2),
      (c.hauteur ?? 3) + (c.piece.exterieur ? 2 : 3.5),
    );
    cylindre(g, 0.4, 0.45, MAT.potNoir, 0, 0.23, 0, 16);
    cylindre(g, Math.max(0.06, r * 0.07), h, M.ecorce, 0, h / 2, 0, 8);
    cime(g, r * 0.75, h);
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + r;
      const s = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.3, 0),
        feuillages[(k + 1) % 3],
      );
      s.position.set(Math.cos(a) * r * 0.6, 0.25, Math.sin(a) * r * 0.6);
      g.add(s);
    }
  },
  ronde: (g, r, c, m) => {
    cylindre(g, r, 0.04, MAT.chene, 0, m.n ? 0.74 : 1.08, 0, 24);
    cylindre(
      g,
      0.04,
      m.n ? 0.72 : 1.06,
      MAT.noir,
      0,
      (m.n ? 0.72 : 1.06) / 2,
      0,
      8,
    );
    cylindre(g, 0.25, 0.02, MAT.noir, 0, 0.01, 0, 16);
    for (let i = 0; i < m.n; i++) {
      const a = (i / m.n) * Math.PI * 2 + 0.5;
      chaise(
        g,
        "#6b7280",
        Math.cos(a) * (r + 0.35),
        Math.sin(a) * (r + 0.35),
        Math.atan2(Math.cos(a), Math.sin(a)),
      );
    }
  },
  chaise: (g) => chaise(g, "#6b7280", 0, 0, 0),
  "table-basse": (g, r) => cylindre(g, r, 0.4, MAT.chene, 0, 0.2, 0, 24),
  helisurface: (g, r) => {
    cylindre(g, r, 0.05, mat("#2b2e35"), 0, 0.33, 0, 48);
    const anneau = new THREE.Mesh(
      new THREE.RingGeometry(r - 1.2, r - 1, 48),
      marquage,
    );
    anneau.rotation.x = -Math.PI / 2;
    anneau.position.y = 0.36;
    g.add(anneau);
    for (const [l, p, x] of [
      [0.4, 4, -1.4],
      [0.4, 4, 1.4],
      [2.8, 0.4, 0],
    ])
      boite(g, l, 0.01, p, MAT.blanc, x, 0.36, 0);
  },
};

export const LIGNES = {
  ecran: (g, l, c) => {
    const h = Math.min(l * 0.5625, (c.hauteur ?? 3) - 0.9, 3.4);
    const e = moniteur(
      g,
      0,
      0.9 + h / 2,
      0.05,
      l - 0.1,
      h,
      c.zik ? MAGENTA : NEUTRE,
    );
    const dos = moniteur(
      g,
      0,
      0.9 + h / 2,
      -0.05,
      l - 0.1,
      h,
      c.zik ? MAGENTA : NEUTRE,
      Math.PI,
    );
    for (const m of [e, dos]) {
      m.material.emissiveIntensity = c.zik ? 0.9 : 0.35;
      if (c.zik)
        c.anime(
          (dt, t) =>
            (m.material.emissiveIntensity = 0.75 + 0.25 * Math.sin(t * 2.2)),
        );
    }
  },
  velo: (g, l) => {
    for (let x = -l / 2 + 0.4; x < l / 2; x += 0.7) {
      for (const z of [-0.5, 0.5]) {
        const roue = new THREE.Mesh(
          new THREE.TorusGeometry(0.33, 0.025, 6, 20),
          MAT.noir,
        );
        roue.rotation.y = Math.PI / 2;
        roue.position.set(x, 0.35, z);
        g.add(roue);
      }
      boite(g, 0.04, 0.04, 1, M.rouge, x, 0.6, 0);
      boite(g, 0.1, 0.05, 0.25, MAT.noir, x, 0.9, 0.3);
    }
    boite(g, l, 0.05, 0.05, MAT.alu, 0, 0.5, -0.9);
  },
  banc: (g, l) => {
    boite(g, l, 0.06, 0.4, MAT.chene, 0, 0.45, 0);
    for (const x of [-l / 2 + 0.1, l / 2 - 0.1]) pied(g, x, 0, 0.45);
    boite(g, l, 0.05, 0.05, MAT.alu, 0, 1.8, -0.25);
  },
};

export const TRACES = {
  ruisseau: (parent, d, c) => {
    const pts = [];
    let [x, y] = [d[0][1], d[0][2]];
    for (const [cmd, ...v] of d.slice(1)) {
      if (cmd !== "C") continue;
      const [a, b, e, f, gx, gy] = v;
      const courbe = new THREE.CubicBezierCurve(
        ...[
          [x, y],
          [a, b],
          [e, f],
          [gx, gy],
        ].map(([u, w]) => new THREE.Vector2(u, w)),
      );
      pts.push(...courbe.getPoints(30));
      [x, y] = [gx, gy];
    }
    const chemin = new THREE.CatmullRomCurve3(
      pts.map((p) => {
        const q = versLocal(p.x, p.y);
        return new THREE.Vector3(q.x, 0.04, q.z);
      }),
    );
    const eau = new THREE.Mesh(
      new THREE.TubeGeometry(chemin, 80, 0.35, 8),
      M.eau,
    );
    eau.scale.y = 0.08;
    parent.add(eau);
    c.anime((dt, t) => (eau.material.opacity = 0.7 + 0.08 * Math.sin(t * 1.5)));
    for (let i = 0; i < pts.length; i += 6) {
      const q = versLocal(pts[i].x, pts[i].y + (i % 12 ? 0.55 : -0.55));
      const pierre = boite(parent, 0.3, 0.12, 0.22, MAT.beton, q.x, 0.06, q.z);
      pierre.rotation.y = i;
    }
  },
};
