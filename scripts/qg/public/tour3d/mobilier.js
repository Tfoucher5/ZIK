// Un meuble du plan → un objet 3D. Les rectangles ont leur grand côté sur l'axe x local.
import { MAT, boite, cylindre, chaise } from "../meubles.js";
import { versLocal } from "./repere.js";
import { rotation } from "./sens.js";
import {
  M,
  groupe,
  lueur,
  mat,
  moniteur,
  pied,
  tabouret,
} from "./mobilier-base.js";
import { LOISIRS, POINTS_LOISIRS, TRACES_LOISIRS } from "./mobilier-loisirs.js";
import { LIGNES, POINTS, TECHNIQUE, TRACES } from "./mobilier-technique.js";

function plateau(g, l, p, m = MAT.chene, h = 0.74) {
  boite(g, l, 0.05, p, m, 0, h, 0);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      pied(g, sx * (l / 2 - 0.1), sz * (p / 2 - 0.1), h);
}

function rayons(g, l, p, h, n, m = MAT.blanc, livres = true) {
  for (const s of [-1, 1]) boite(g, 0.03, h, p, m, s * (l / 2), h / 2, 0);
  for (let k = 0; k <= n; k++) {
    const y = 0.05 + (k * (h - 0.1)) / n;
    boite(g, l, 0.03, p, m, 0, y, 0);
    if (livres && k < n)
      for (let x = -l / 2 + 0.1; x < l / 2 - 0.1; x += 0.35)
        boite(
          g,
          0.28,
          0.24,
          p * 0.7,
          k % 2 ? M.rouge : M.bleu,
          x + 0.14,
          y + 0.14,
          0,
        );
  }
}

const SALON = {
  table: (g, l, p) => {
    plateau(g, l, p);
    const n = Math.max(1, Math.floor(l / 0.75));
    for (let i = 0; i < n; i++) {
      const x = -l / 2 + (i + 0.5) * (l / n);
      chaise(g, "#6b7280", x, -p / 2 - 0.35, Math.PI);
      chaise(g, "#6b7280", x, p / 2 + 0.35, 0);
    }
  },
  "grande-table": (g, l, p) => plateau(g, l, p, MAT.blanc, 0.9),
  "table-basse": (g, l, p) => {
    boite(g, l, 0.06, p, M.noyer, 0, 0.38, 0);
    boite(g, l * 0.8, 0.35, p * 0.6, MAT.noir, 0, 0.18, 0);
  },
  canape: (g, l, p) => {
    const m = mat("#59606e", { roughness: 1 });
    boite(g, l, 0.42, p, m, 0, 0.21, 0);
    boite(g, l, 0.5, 0.22, m, 0, 0.62, p / 2 - 0.11);
    for (const s of [-1, 1])
      boite(g, 0.2, 0.25, p, m, s * (l / 2 - 0.1), 0.55, 0);
    const n = Math.max(1, Math.floor(l / 0.8));
    for (let i = 0; i < n; i++)
      boite(
        g,
        l / n - 0.05,
        0.1,
        p - 0.3,
        mat("#6b7382", { roughness: 1 }),
        -l / 2 + (i + 0.5) * (l / n),
        0.47,
        -0.08,
      );
  },
  bar: (g, l, p) => {
    boite(g, l, 1.05, p, MAT.noir, 0, 0.53, 0);
    boite(g, l + 0.1, 0.05, p + 0.15, MAT.chene, 0, 1.08, 0);
    boite(g, l, 0.04, 0.04, M.bleuLed, 0, 0.05, p / 2 + 0.02);
  },
  comptoir: (g, l, p) => {
    SALON.bar(g, l, p);
    cylindre(g, 0.12, 0.5, M.inox, -l / 2 + 0.4, 1.35, 0, 12);
    boite(g, 0.5, 0.45, 0.4, MAT.noir, -l / 2 + 0.4, 1.33, 0);
    for (let x = -l / 2 + 0.5; x < l / 2 - 0.3; x += 0.7)
      tabouret(g, x, p / 2 + 0.4);
  },
  etagere: (g, l, p) => rayons(g, l, p, 2, 5),
  rayonnage: (g, l, p) => rayons(g, l, p, 2.4, 5, M.gris, false),
  casier: (g, l, p) => {
    boite(g, l, 1.9, p, M.gris, 0, 0.95, 0);
    for (let x = -l / 2 + 0.15; x < l / 2; x += 0.3)
      boite(g, 0.02, 1.8, 0.01, MAT.noir, x, 0.95, p / 2 + 0.005);
  },
  "meuble-bas": (g, l, p) =>
    boite(g, l, 1.1, Math.max(p, 0.4), MAT.blanc, 0, 0.55, 0),
  copieur: (g, l, p) => {
    boite(g, l, 0.9, p, MAT.blanc, 0, 0.45, 0);
    for (let x = -l / 2 + 0.6; x < l / 2; x += 1.2) {
      boite(g, 0.6, 0.35, 0.55, M.gris, x, 1.08, 0);
      boite(g, 0.12, 0.08, 0.02, M.led, x + 0.2, 1.2, 0.28);
    }
  },
  cabine: (g, l, p) => {
    boite(g, l, 2.3, 0.06, M.feutre, 0, 1.15, -p / 2);
    for (const s of [-1, 1])
      boite(g, 0.06, 2.3, p, M.feutre, s * (l / 2), 1.15, 0);
    boite(g, l, 0.06, p, M.feutre, 0, 2.33, 0);
    boite(g, l, 2.2, 0.03, MAT.verre, 0, 1.1, p / 2);
    boite(g, l - 0.2, 0.04, 0.4, MAT.chene, 0, 1.05, -p / 2 + 0.25);
    cylindre(g, 0.2, 0.45, M.vert, 0, 0.23, 0.15, 12);
  },
  lineaire: (g, l, p) => {
    boite(g, l, 0.9, p, M.inox, 0, 0.45, 0);
    boite(g, l, 0.04, p * 0.7, MAT.verre, 0, 1.25, 0);
    const bacs = [M.vert, M.rouge, MAT.chene];
    for (let i = 0; i < Math.floor(l / 0.6); i++)
      boite(
        g,
        0.5,
        0.06,
        p * 0.6,
        bacs[i % 3],
        -l / 2 + 0.3 + i * 0.6,
        0.93,
        0,
      );
  },
  caisse: (g, l, p) => {
    boite(g, l, 0.95, p, MAT.blanc, 0, 0.48, 0);
    moniteur(g, 0, 1.15, 0, 0.3, 0.2);
  },
  "plan-de-travail": (g, l, p) => {
    boite(g, l, 0.88, p, M.inox, 0, 0.44, 0);
    for (let x = -l / 2 + 0.6; x < l / 2; x += 1.6)
      boite(g, 0.45, 0.08, 0.35, MAT.blanc, x, 0.92, 0);
  },
  fourneau: (g, l, p) => {
    boite(g, l, 0.88, p, M.inox, 0, 0.44, 0);
    for (let x = -l / 2 + 0.35; x < l / 2; x += 0.5)
      for (const z of [-0.25, 0.25])
        cylindre(g, 0.14, 0.03, MAT.noir, x, 0.9, z, 12);
    boite(g, l, 0.5, p, M.inox, 0, 2.4, 0);
  },
  coiffeuse: (g, l, p) => {
    boite(g, l, 0.75, p, MAT.blanc, 0, 0.375, 0);
    boite(
      g,
      l,
      1,
      0.03,
      mat("#dfe8ef", { metalness: 0.9, roughness: 0.05 }),
      0,
      1.4,
      -p / 2,
    );
    for (let x = -l / 2 + 0.2; x < l / 2; x += 0.3)
      cylindre(g, 0.04, 0.04, lueur("#fff4d6", 2), x, 1.95, -p / 2 + 0.03, 8);
  },
  chariot: (g, l, p) => {
    for (const y of [0.25, 0.85]) boite(g, l, 0.04, p, M.inox, 0, y, 0);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        pied(g, sx * (l / 2 - 0.05), sz * (p / 2 - 0.05), 0.9, M.inox);
  },
  "mur-a-ecrire": (g, l) => {
    boite(g, l, 2.2, 0.06, MAT.blanc, 0, 1.3, 0);
    const feutres = [M.rouge, M.bleu, M.vert];
    for (let i = 0; i < Math.floor(l / 0.9); i++)
      boite(
        g,
        0.5,
        0.3,
        0.01,
        feutres[i % 3],
        -l / 2 + 0.5 + i * 0.9,
        1.3 + (i % 2) * 0.5,
        0.04,
      );
  },
  "mur-de-maquettes": (g, l) => {
    boite(g, l, 2.2, 0.06, M.anthracite, 0, 1.3, 0);
    for (let x = -l / 2 + 0.3; x < l / 2 - 0.2; x += 0.45)
      for (const y of [0.8, 1.35, 1.9])
        moniteur(g, x, y, 0.04, 0.34, 0.42, "#e5e7eb");
  },
  lit: (g, l, p) => {
    boite(g, l, 0.5, p, MAT.blanc, 0, 0.25, 0);
    boite(g, l - 0.1, 0.12, p - 0.05, M.lin, 0, 0.56, 0);
    boite(g, 0.35, 0.1, p - 0.2, MAT.blanc, -l / 2 + 0.25, 0.66, 0);
  },
  banc: (g, l, p) => {
    boite(g, l, 0.06, Math.min(p, 0.45), MAT.chene, 0, 0.45, 0);
    pied(g, -l / 2 + 0.1, 0, 0.45);
    pied(g, l / 2 - 0.1, 0, 0.45);
  },
};

const RECTS = { ...SALON, ...LOISIRS, ...TECHNIQUE };
const PONCTUELS = { ...POINTS, ...POINTS_LOISIRS };
const CHEMINS = { ...TRACES, ...TRACES_LOISIRS };
const signales = new Set();

function inconnu(g, type, l = 0.6, p = 0.6) {
  if (!signales.has(type)) {
    signales.add(type);
    console.warn(`Tour 3D : meuble « ${type} » sans modèle, boîte neutre.`);
  }
  boite(g, l, 0.8, p, M.gris, 0, 0.4, 0);
}

// c : { piece, zik (écrans ZIK), hauteur (sous plafond), anime(fn) }.
export function meuble3d(parent, m, c) {
  if (m.d) {
    const f = CHEMINS[m.type];
    return f ? f(parent, m.d, c) : inconnu(groupe(parent, 0, 0), m.type);
  }
  if ("x1" in m) {
    const a = versLocal(m.x1, m.y1);
    const b = versLocal(m.x2, m.y2);
    const long = Math.hypot(b.x - a.x, b.z - a.z);
    const g = groupe(
      parent,
      (a.x + b.x) / 2,
      (a.z + b.z) / 2,
      Math.atan2(-(b.z - a.z), b.x - a.x),
    );
    return (LIGNES[m.type] ?? ((g) => inconnu(g, m.type, long)))(g, long, c);
  }
  if (m.w === undefined) {
    const p = versLocal(m.x, m.y);
    const g = groupe(parent, p.x, p.z, rotation(m, c.piece));
    return (PONCTUELS[m.type] ?? ((g) => inconnu(g, m.type)))(
      g,
      m.r ?? 0.3,
      c,
      m,
    );
  }
  const p = versLocal(m.x + m.w / 2, m.y + m.h / 2);
  const hz = m.w >= m.h;
  const g = groupe(parent, p.x, p.z, rotation(m, c.piece));
  const [l, q] = hz ? [m.w, m.h] : [m.h, m.w];
  return (RECTS[m.type] ?? ((g) => inconnu(g, m.type, l, q)))(g, l, q, c, m);
}
