import * as THREE from "three";

const MATS = new Map();
const mat = (c, r = 0.7) => {
  const cle = `${c}|${r}`;
  if (!MATS.has(cle))
    MATS.set(cle, new THREE.MeshStandardMaterial({ color: c, roughness: r }));
  return MATS.get(cle);
};
const OR = new THREE.MeshStandardMaterial({
  color: "#f5c542",
  metalness: 0.85,
  roughness: 0.3,
  emissive: "#7a5200",
  emissiveIntensity: 0.6,
});
const NOIR = mat("#111111", 0.4);
const YEUX = mat("#1a1210", 0.3);

const cyl = (h, rh, rb = rh) => new THREE.CylinderGeometry(rh, rb, h, 8);
const G = {
  cuisse: cyl(0.34, 0.075, 0.064),
  tibia: cyl(0.32, 0.062, 0.05),
  chaussure: new THREE.BoxGeometry(0.11, 0.07, 0.22),
  bassin: new THREE.BoxGeometry(0.32, 0.16, 0.2),
  torse: new THREE.CylinderGeometry(0.2, 0.16, 0.52, 10),
  epaules: new THREE.SphereGeometry(0.2, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2),
  cou: cyl(0.12, 0.055, 0.06),
  tete: new THREE.SphereGeometry(0.15, 16, 12),
  oeil: new THREE.SphereGeometry(0.018, 6, 4),
  nez: new THREE.ConeGeometry(0.022, 0.06, 5),
  oreille: new THREE.SphereGeometry(0.035, 6, 4),
  coupe: new THREE.SphereGeometry(
    0.162,
    14,
    8,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.55,
  ),
  longs: new THREE.BoxGeometry(0.3, 0.36, 0.1),
  meche: new THREE.BoxGeometry(0.05, 0.26, 0.12),
  verre: new THREE.TorusGeometry(0.038, 0.008, 6, 12),
  pont: new THREE.BoxGeometry(0.035, 0.008, 0.008),
  branche: new THREE.BoxGeometry(0.008, 0.008, 0.14),
  bras: cyl(0.27, 0.06, 0.055),
  manche: cyl(0.12, 0.068, 0.066),
  avantBras: cyl(0.24, 0.052, 0.045),
  main: new THREE.SphereGeometry(0.05, 8, 6),
  capuche: new THREE.SphereGeometry(0.13, 10, 6),
  badge: new THREE.BoxGeometry(0.07, 0.1, 0.01),
  cravate: new THREE.BoxGeometry(0.04, 0.24, 0.012),
  noeud: new THREE.BoxGeometry(0.05, 0.04, 0.02),
  pochette: new THREE.BoxGeometry(0.06, 0.025, 0.012),
  cercle: new THREE.TorusGeometry(0.135, 0.012, 6, 24),
  pointe: new THREE.ConeGeometry(0.018, 0.06, 4),
  aura: new THREE.CircleGeometry(0.75, 40),
  tablier: new THREE.BoxGeometry(0.3, 0.7, 0.02),
  gilet: new THREE.CylinderGeometry(0.208, 0.168, 0.42, 10),
  chariot: new THREE.BoxGeometry(0.42, 0.5, 0.34),
  seau: cyl(0.22, 0.12, 0.1),
};
const V = new THREE.Shape([
  new THREE.Vector2(-0.075, 0),
  new THREE.Vector2(0.075, 0),
  new THREE.Vector2(0, -0.2),
]);
G.col = new THREE.ShapeGeometry(V);

let auraMat;
function matAura() {
  if (auraMat) return auraMat;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  const d = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  d.addColorStop(0, "rgba(255,210,90,0.85)");
  d.addColorStop(0.55, "rgba(245,190,60,0.35)");
  d.addColorStop(0.8, "rgba(245,190,60,0.5)");
  d.addColorStop(1, "rgba(245,190,60,0)");
  x.fillStyle = d;
  x.fillRect(0, 0, 128, 128);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  auraMat = new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return auraMat;
}

function piece(parent, geo, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  parent.add(o);
  return o;
}

function pivot(parent, x, y, z = 0) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  parent.add(p);
  return p;
}

function tete(buste, t) {
  const peau = mat(t.peau);
  const cheveu = mat(t.cheveux, 0.85);
  const p = pivot(buste, 0, 0.64);
  const crane = piece(p, G.tete, peau, 0, 0.16);
  crane.scale.y = 1.1;
  // Les PNJ, vus de loin et en nombre, n'ont ni yeux, ni oreilles, ni nez : moins d'objets à dessiner.
  if (t.rang !== "pnj") {
    for (const s of [-1, 1]) {
      piece(p, G.oeil, YEUX, s * 0.052, 0.18, 0.135);
      piece(p, G.oreille, peau, s * 0.148, 0.15, 0).scale.z = 0.6;
    }
    piece(p, G.nez, peau, 0, 0.14, 0.152).rotation.x = Math.PI / 2;
  }
  piece(p, G.coupe, cheveu, 0, 0.17, -0.012).rotation.x = -0.32;
  if (t.longs) {
    piece(p, G.longs, cheveu, 0, 0.05, -0.1);
    for (const s of [-1, 1]) piece(p, G.meche, cheveu, s * 0.14, 0.07, -0.02);
  }
  if (t.lunettes) {
    for (const s of [-1, 1]) {
      piece(p, G.verre, NOIR, s * 0.055, 0.18, 0.15);
      piece(p, G.branche, NOIR, s * 0.145, 0.18, 0.08);
    }
    piece(p, G.pont, NOIR, 0, 0.18, 0.152);
  }
  if (t.rang === "fondateur") {
    piece(p, G.cercle, OR, 0, 0.255, -0.01).rotation.x = Math.PI / 2;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      piece(p, G.pointe, OR, Math.sin(a) * 0.135, 0.29, Math.cos(a) * 0.135);
    }
  }
  return { p, crane };
}

function bras(buste, t, s) {
  const haut = mat(t.haut);
  const peau = mat(t.peau);
  const courtes = t.style === "tshirt";
  const epaule = pivot(buste, s * 0.25, 0.5);
  epaule.rotation.z = s * 0.07;
  piece(epaule, G.bras, courtes ? peau : haut, 0, -0.135);
  if (courtes) piece(epaule, G.manche, haut, 0, -0.05);
  const coude = pivot(epaule, 0, -0.27);
  piece(coude, G.avantBras, courtes ? peau : haut, 0, -0.12);
  piece(coude, G.main, peau, 0, -0.27).scale.set(0.8, 1.1, 0.9);
  return { epaule, coude };
}

function jambe(racine, t, s) {
  const bas = mat(t.bas);
  const hanche = pivot(racine, s * 0.1, 0.72);
  piece(hanche, G.cuisse, bas, 0, -0.17);
  const genou = pivot(hanche, 0, -0.34);
  piece(genou, G.tibia, bas, 0, -0.16);
  piece(genou, G.chaussure, mat(t.chaussures, 0.5), 0, -0.355, 0.04);
  return { hanche, genou };
}

function tenueBuste(buste, t, badge) {
  if (t.style === "costume") {
    piece(buste, G.col, mat(t.chemise, 0.5), 0, 0.56, 0.128);
    piece(buste, G.noeud, mat(t.cravate, 0.5), 0, 0.535, 0.137);
    piece(buste, G.cravate, mat(t.cravate, 0.5), 0, 0.41, 0.133);
    if (t.rang === "fondateur") piece(buste, G.pochette, OR, -0.1, 0.42, 0.12);
    return;
  }
  if (t.rang !== "pnj")
    piece(buste, G.badge, mat(badge, 0.5), 0.09, 0.3, 0.115);
  if (t.tablier) piece(buste, G.tablier, mat(t.tablier), 0, 0.15, 0.125);
  if (t.gilet)
    piece(buste, G.gilet, mat(t.gilet, 0.5), 0, 0.33, 0).scale.z = 0.66;
  if (t.style === "sweat")
    piece(buste, G.capuche, mat(t.haut), 0, 0.55, -0.1).scale.set(
      1.25,
      0.55,
      0.8,
    );
}

// Corps articulé : hanches, genoux, buste, tête, épaules et coudes pivotent pour les animations.
export function construire(t, badge, id) {
  const racine = new THREE.Group();
  racine.scale.setScalar(t.taille);
  const haut = mat(t.haut);
  const bassin = piece(racine, G.bassin, mat(t.bas), 0, 0.76);
  const buste = pivot(racine, 0, 0.78);
  const torse = piece(buste, G.torse, haut, 0, 0.3);
  torse.scale.z = 0.62;
  piece(buste, G.epaules, haut, 0, 0.555).scale.set(1, 0.35, 0.62);
  piece(buste, G.cou, mat(t.peau), 0, 0.62);
  tenueBuste(buste, t, badge);
  const tt = tete(buste, t);
  const [bg, bd] = [-1, 1].map((s) => bras(buste, t, s));
  const [jg, jd] = [-1, 1].map((s) => jambe(racine, t, s));
  if (t.chariot) {
    piece(racine, G.chariot, mat("#94a3b8", 0.5), 0, 0.3, 0.55);
    piece(racine, G.seau, mat("#facc15", 0.5), 0, 0.66, 0.55);
  }
  racine.traverse((o) => (o.userData.id = id));
  let aura = null;
  if (t.rang === "fondateur") {
    aura = new THREE.Mesh(G.aura, matAura());
    aura.rotation.x = -Math.PI / 2;
    aura.renderOrder = 1;
  }
  return {
    racine,
    aura,
    buste,
    tete: tt.p,
    hanches: [jg.hanche, jd.hanche],
    genoux: [jg.genou, jd.genou],
    epaules: [bg.epaule, bd.epaule],
    coudes: [bg.coude, bd.coude],
    cliquables: [torse, bassin, tt.crane],
  };
}
