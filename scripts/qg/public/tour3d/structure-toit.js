// Couronnement et éléments sur plusieurs niveaux : locaux techniques, héliport, enseigne ZIK, verrière, mur d'eau.
import * as THREE from "three";
import { MAT, toile } from "../meubles.js";
import { MAGENTA, lettresZik, lumineux } from "../penthouse-terrasse.js";
import { VIDES, niveau } from "../tour/plan.js";
import { versLocal } from "./repere.js";
import { instances, matrice, panneau } from "./structure-facade.js";

const persiennes = new THREE.MeshStandardMaterial({
  color: "#2b2e36",
  metalness: 0.6,
  roughness: 0.45,
});
const blanc = lumineux("#f4f4f4", 0.15);
const verre = new THREE.MeshStandardMaterial({
  color: "#cfe6f2",
  transparent: true,
  opacity: 0.22,
  roughness: 0.05,
  depthWrite: false,
});

// Locaux techniques : murs du plan (acrotère = écran à persiennes pleine hauteur), toiture à +38.
function locaux(g, n, mats) {
  for (const m of n.murs) {
    const seg = [m.x1, m.y1, m.x2, m.y2];
    if (m.type === "acrotere") panneau(g, seg, 0, n.h, persiennes, 0.25);
    else if (m.type.startsWith("vitrage")) {
      panneau(g, seg, 0, n.h, mats.vitrage, 0.03);
      panneau(g, seg, n.h - 0.15, n.h, mats.meneau, 0.12);
    }
  }
}

function heliport(g, n, t) {
  const p = t.mobilier.find((m) => m.type === "plateforme");
  const s = t.mobilier.find((m) => m.type === "helisurface");
  const y = t.altitude - n.z + 0.25;
  const c = versLocal(p.x + p.w / 2, p.y + p.h / 2);
  instances(g, [matrice(c.x, y - 0.15, c.z, p.w, 0.3, p.h)], MAT.noir);
  const o = versLocal(s.x, s.y);
  const anneau = new THREE.Mesh(
    new THREE.RingGeometry(s.r * 0.82, s.r * 0.88, 64),
    lumineux("#ffd23f", 0.4),
  );
  anneau.rotation.x = -Math.PI / 2;
  anneau.position.set(o.x, y + 0.01, o.z);
  g.add(anneau);
  const h = s.r * 0.5;
  instances(
    g,
    [
      matrice(o.x - h * 0.35, y + 0.01, o.z, 0.5, 0.02, h),
      matrice(o.x + h * 0.35, y + 0.01, o.z, 0.5, 0.02, h),
      matrice(o.x, y + 0.01, o.z, h * 0.7, 0.02, 0.5),
    ],
    blanc,
  );
  const balise = lumineux("#3cff7a", 3);
  const feux = [];
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    feux.push(
      matrice(
        o.x + Math.cos(a) * s.r,
        y + 0.08,
        o.z + Math.sin(a) * s.r,
        0.18,
        0.16,
        0.18,
      ),
    );
  }
  instances(g, feux, balise);
  return (t2) => {
    balise.emissiveIntensity = Math.sin(t2 * 4) > 0 ? 3 : 0.2;
  };
}

// Enseigne ZIK sur les écrans du plan (faces nord et sud du toit), lettres de la hauteur du local.
function enseigne(g, n) {
  const mat = lumineux(MAGENTA, 2.4);
  const ecrans = n.pieces
    .flatMap((p) => p.mobilier)
    .filter((m) => m.type === "ecran");
  for (const e of ecrans) {
    const c = versLocal((e.x1 + e.x2) / 2, e.y1);
    const nord = c.z < 0;
    const lettres = lettresZik(g, n.h - 0.4, mat, 0.4);
    lettres.position.set(c.x, 0.2, c.z + (nord ? -0.2 : 0.2));
    if (nord) lettres.rotation.y = Math.PI;
  }
  return (t) => {
    const panne = Math.sin(t * 13.7) > 0.985;
    mat.emissiveIntensity = panne ? 0.6 : 2.4 + Math.sin(t * 2) * 0.4;
  };
}

// Verrière à deux pans posée sur la trémie de l'atrium.
function verriere(g, v, mats) {
  const [x1, y1, x2, y2] = v.rect;
  const a = versLocal(x1, y1);
  const b = versLocal(x2, y2);
  const l = b.x - a.x;
  const p = b.z - a.z;
  const fleche = 1.4;
  const pan = Math.hypot(p / 2, fleche);
  const pente = Math.atan2(fleche, p / 2);
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(l, 0.03, pan), verre);
    m.position.set((a.x + b.x) / 2, fleche / 2, (a.z + b.z) / 2 + (s * p) / 4);
    m.rotation.x = s * pente;
    g.add(m);
  }
  const chevrons = [
    matrice((a.x + b.x) / 2, fleche, (a.z + b.z) / 2, l, 0.12, 0.12),
  ];
  for (let x = a.x; x <= b.x + 0.01; x += 1.2)
    for (const s of [-1, 1]) {
      chevrons.push(
        new THREE.Matrix4()
          .makeTranslation(x, fleche / 2, (a.z + b.z) / 2 + (s * p) / 4)
          .multiply(new THREE.Matrix4().makeRotationX(s * pente))
          .multiply(new THREE.Matrix4().makeScale(0.06, 0.08, pan)),
      );
    }
  instances(g, chevrons, mats.meneau);
}

// Mur d'eau : lames lumineuses qui coulent, face à l'atrium.
function murEau(g, v) {
  const [x1, y1, x2, y2] = v.rect;
  panneau(g, [x1 + 0.3, y1, x1 + 0.3, y2], 0, v.hauteur, MAT.sombre, 0.6);
  const tex = toile(64, 256, (x) => {
    x.fillStyle = "#06222e";
    x.fillRect(0, 0, 64, 256);
    for (let k = 0; k < 16; k++) {
      const gr = x.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, "rgba(120,230,255,0)");
      gr.addColorStop(0.5, `rgba(150,240,255,${0.3 + (k % 3) * 0.15})`);
      gr.addColorStop(1, "rgba(120,230,255,0)");
      x.fillStyle = gr;
      x.fillRect(k * 4 + 1, ((k * 53) % 256) - 128, 2, 256);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  const eau = new THREE.MeshStandardMaterial({
    map: tex,
    emissive: "#ffffff",
    emissiveMap: tex,
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.9,
  });
  panneau(g, [x2 - 0.3, y1, x2 - 0.3, y2], 0.4, v.hauteur, eau, 0.04);
  panneau(g, [x2, y1, x2, y2], 0, 0.4, MAT.noir, 0.5);
  return (dt) => {
    tex.offset.y += dt * 0.6;
  };
}

export function couronnement(groupes, mats) {
  const animations = [];
  const toit = niveau("toit");
  const g = groupes.toit;
  locaux(g, toit, mats.toit);
  for (const t of toit.terrasses)
    if (t.altitude !== undefined) animations.push(heliport(g, toit, t));
  animations.push(enseigne(g, toit));
  for (const v of VIDES) {
    if (v.type === "verriere") verriere(groupes[v.niveau], v, mats[v.niveau]);
    if (v.type === "eau") {
      const f = murEau(groupes[v.niveau], v);
      animations.push((t, dt) => f(dt));
    }
  }
  return (dt, t) => animations.forEach((f) => f(t, dt));
}
