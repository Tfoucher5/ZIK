// Enveloppe d'un niveau : murs-rideaux, acrotères, terrasses et garde-corps.
import * as THREE from "three";
import { MAT } from "../meubles.js";
import { versLocal } from "./repere.js";
import { rect } from "../tour/outils.js";
import {
  DALLE,
  acroteres,
  dalle,
  facades,
  gardeCorps,
} from "./structure-plan.js";

export const ALLEGE = 0.9;
const TRAMEF = 1.8;
const std = (c, o = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });

const GAMMES = {
  1: {
    meneau: "#8f98a3",
    sol: MAT.beton,
    poteau: MAT.beton,
    teinte: "#9fc3dd",
  },
  2: {
    meneau: "#8a6a3c",
    sol: MAT.chene,
    poteau: MAT.platre,
    teinte: "#b9c9cf",
  },
  3: {
    meneau: "#d4a537",
    sol: std("#ece7e0", { roughness: 0.2 }),
    poteau: MAT.blanc,
    teinte: "#d8c9a6",
  },
};
const partages = {};
// Matériaux d'un niveau ; le vitrage est propre au niveau pour allumer ses fenêtres seul.
export function materiaux(gamme) {
  const g = GAMMES[gamme];
  partages[gamme] ??= {
    meneau: std(g.meneau, { metalness: 0.8, roughness: 0.3 }),
    allege: std("#1d2128", { metalness: 0.4, roughness: 0.4 }),
    nez: std("#2a2d35", { roughness: 0.5 }),
    sol: g.sol,
    poteau: g.poteau,
  };
  return {
    ...partages[gamme],
    vitrage: new THREE.MeshStandardMaterial({
      color: g.teinte,
      transparent: true,
      opacity: 0.32,
      roughness: 0.05,
      metalness: 0.3,
      emissive: "#ffcf8a",
      emissiveIntensity: 0,
      depthWrite: false,
    }),
  };
}

const UNITE = new THREE.BoxGeometry(1, 1, 1);
const Q = new THREE.Quaternion();
const AXE_Y = new THREE.Vector3(0, 1, 0);

// Matrice d'une boîte de long l, haut h, épaisse e, centrée en (x, y, z) du plan local, tournée de a.
export function matrice(x, y, z, l, h, e, a = 0) {
  Q.setFromAxisAngle(AXE_Y, a);
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    Q.clone(),
    new THREE.Vector3(l, h, e),
  );
}

export function instances(parent, matrices, mat, geo = UNITE) {
  if (!matrices.length) return null;
  const m = new THREE.InstancedMesh(geo, mat, matrices.length);
  matrices.forEach((x, k) => m.setMatrixAt(k, x));
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

const repere = ([x1, y1, x2, y2]) => {
  const a = versLocal(x1, y1);
  const b = versLocal(x2, y2);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return { a, dx, dz, l: Math.hypot(dx, dz), angle: Math.atan2(-dz, dx) };
};

// Panneau plein le long d'un segment du plan, de y0 à y1.
export function panneau(parent, seg, y0, y1, mat, e = 0.2) {
  const r = repere(seg);
  const m = new THREE.Mesh(UNITE, mat);
  m.applyMatrix4(
    matrice(
      r.a.x + r.dx / 2,
      (y0 + y1) / 2,
      r.a.z + r.dz / 2,
      r.l,
      y1 - y0,
      e,
      r.angle,
    ),
  );
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

// Meneaux tous les 1,80 m et traverse, de y0 à y1, ajoutés à la liste de matrices.
function ossature(liste, seg, y0, y1) {
  const r = repere(seg);
  const n = Math.max(1, Math.round(r.l / TRAMEF));
  for (let k = 0; k <= n; k++) {
    const f = k / n;
    liste.push(
      matrice(
        r.a.x + r.dx * f,
        (y0 + y1) / 2,
        r.a.z + r.dz * f,
        0.07,
        y1 - y0,
        0.14,
        r.angle,
      ),
    );
  }
  liste.push(
    matrice(r.a.x + r.dx / 2, y1, r.a.z + r.dz / 2, r.l, 0.08, 0.16, r.angle),
  );
}

// Façades du niveau. Renvoie le groupe de la façade sud au-dessus de l'allège (masqué en coupe).
export function facade(g, n, mats) {
  const H = n.h - DALLE;
  const sudHaut = new THREE.Group();
  g.add(sudHaut);
  const bas = [];
  const sud = [];
  for (const f of facades(n)) {
    const seg = [f.x1, f.y1, f.x2, f.y2];
    if (f.type === "porteur") {
      panneau(g, seg, 0, H, MAT.beton, 0.3);
      continue;
    }
    const haut = f.cote === "sud" ? sudHaut : g;
    panneau(g, seg, 0, ALLEGE, mats.allege, 0.06);
    panneau(haut, seg, ALLEGE, H, mats.vitrage, 0.03);
    ossature(bas, seg, 0, ALLEGE);
    ossature(f.cote === "sud" ? sud : bas, seg, ALLEGE, H);
  }
  instances(g, bas, mats.meneau);
  instances(sudHaut, sud, mats.meneau);
  return sudHaut;
}

const bois = std("#7a5236", { roughness: 0.85, side: THREE.DoubleSide });
const verreGC = new THREE.MeshStandardMaterial({
  color: "#cfe6f2",
  transparent: true,
  opacity: 0.25,
  roughness: 0.05,
  depthWrite: false,
});

// Toit du niveau i en retrait : acrotères ; terrasses du niveau : dallage bois et garde-corps verre.
export function toits(g, n, i, mats) {
  for (const seg of acroteres(i))
    panneau(g, seg, n.h - DALLE, n.h + 0.3, mats.nez, 0.3);
  const rampes = [];
  for (const t of n.terrasses) {
    if (t.altitude !== undefined) continue;
    const contour = (pts) =>
      pts.map(([x, y]) => {
        const p = versLocal(x, y);
        return new THREE.Vector2(p.x, p.z);
      });
    const forme = new THREE.Shape(contour(t.poly));
    for (const [x1, y1, x2, y2] of dalle(i).verrieres)
      forme.holes.push(new THREE.Path(contour(rect(x1, y1, x2, y2))));
    const sol = new THREE.Mesh(new THREE.ShapeGeometry(forme), bois);
    sol.rotation.x = Math.PI / 2;
    sol.position.y = 0.03;
    sol.receiveShadow = true;
    g.add(sol);
    for (const seg of gardeCorps(t, n)) {
      panneau(g, seg, 0.05, 1.1, verreGC, 0.02);
      const r = repere(seg);
      rampes.push(
        matrice(
          r.a.x + r.dx / 2,
          1.12,
          r.a.z + r.dz / 2,
          r.l,
          0.05,
          0.06,
          r.angle,
        ),
      );
    }
  }
  instances(g, rampes, mats.meneau);
}
