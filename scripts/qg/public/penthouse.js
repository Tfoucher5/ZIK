import * as THREE from "three";
import {
  MAT,
  boite,
  chaise,
  cylindre,
  ecran,
  mur,
  solForme,
  titre,
  toile,
} from "./meubles.js";
import { ZIK } from "./deco.js";
import {
  CONTOUR,
  INTERIEUR,
  OBSTACLES,
  PAUSES,
  THEO,
  implanter,
  panneaux,
} from "./penthouse-plan.js";
import { decor } from "./penthouse-deco.js";
import {
  MAGENTA,
  POLICE,
  RIEN,
  lumineux,
  terrasse,
} from "./penthouse-terrasse.js";

const std = (c, o = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
const V = (x, z) => new THREE.Vector3(x, 0, z);

const marbre = toile(512, 512, (x, w, h) => {
  x.fillStyle = "#2b2833";
  x.fillRect(0, 0, w, h);
  for (let k = 0; k < 40; k++) {
    x.strokeStyle = k % 4 ? "rgba(200,190,170,0.1)" : "rgba(224,176,42,0.3)";
    x.lineWidth = 0.5 + Math.random() * 2;
    x.beginPath();
    let [px, py] = [Math.random() * w, Math.random() * h];
    x.moveTo(px, py);
    for (let s = 0; s < 6; s++) {
      px += (Math.random() - 0.3) * 120;
      py += (Math.random() - 0.5) * 90;
      x.lineTo(px, py);
    }
    x.stroke();
  }
  x.strokeStyle = "rgba(0,0,0,0.6)";
  x.strokeRect(0, 0, w, h);
});
marbre.wrapS = marbre.wrapT = THREE.RepeatWrapping;

function ecranMural(groupe, l, h, x, y, z, px, py) {
  const t = toile(px, py, () => {});
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(l, h),
    new THREE.MeshStandardMaterial({
      color: "#000000",
      emissive: "#ffffff",
      emissiveMap: t,
      emissiveIntensity: 1.6,
    }),
  );
  m.position.set(x, y, z);
  groupe.add(m);
  return { m, t, x: t.image.getContext("2d") };
}

function dessiner(x, w, h, p) {
  const c = p.alerte ? ZIK.or : MAGENTA;
  x.clearRect(0, 0, w, h);
  x.fillStyle = "#07060d";
  x.fillRect(0, 0, w, h);
  x.shadowColor = c;
  x.shadowBlur = 18;
  x.strokeStyle = c;
  x.lineWidth = 5;
  x.strokeRect(10, 10, w - 20, h - 20);
  x.fillStyle = "#ffd9ff";
  x.font = `700 34px ${POLICE}`;
  x.fillText(p.titre.toUpperCase(), 34, 58);
  if (p.jauges) {
    for (const [k, [nom, v]] of p.jauges.entries()) {
      const y = 92 + k * 62;
      x.fillStyle = "#ffffff";
      x.font = `600 28px ${POLICE}`;
      x.fillText(`${nom}  ${v} %`, 34, y);
      x.fillStyle = "#2a1630";
      x.fillRect(34, y + 10, w - 68, 18);
      x.fillStyle = v >= 80 ? ZIK.or : c;
      x.fillRect(34, y + 10, ((w - 68) * v) / 100, 18);
    }
  } else {
    x.fillStyle = c;
    x.font = `italic 900 120px ${POLICE}`;
    x.fillText(p.valeur, 34, 170);
  }
  x.shadowBlur = 0;
  x.fillStyle = "#c9b6d6";
  x.font = `500 26px ${POLICE}`;
  x.fillText(p.sous, 34, h - 28);
}

function bandeau(x, w, h, texte) {
  x.fillStyle = "#07060d";
  x.fillRect(0, 0, w, h);
  x.shadowColor = ZIK.or;
  x.shadowBlur = 14;
  x.fillStyle = ZIK.or;
  x.font = `800 44px ${POLICE}`;
  x.textAlign = "center";
  x.fillText(texte, w / 2, h / 2 + 15);
  x.textAlign = "left";
  x.shadowBlur = 0;
}

// Grand bureau sur estrade, fauteuil de cuir, lampe ; renvoie l'écran posé sur le bureau.
function bureau(groupe) {
  boite(
    groupe,
    6.2,
    0.06,
    4.5,
    std("#0b0b10", { roughness: 0.15, metalness: 0.4 }),
    9,
    0.03,
    -7.65,
  );
  boite(groupe, 6.2, 0.02, 0.03, lumineux(MAGENTA, 2.2), 9, 0.05, -5.39);
  const [bx, bz, bl, bp] = OBSTACLES.bureau;
  const noyer = std("#2a1a10", { roughness: 0.45 });
  boite(
    groupe,
    bl,
    0.06,
    bp,
    std("#050507", { roughness: 0.05, metalness: 0.5 }),
    bx,
    0.76,
    bz,
  );
  for (const dx of [-1.25, 1.25])
    boite(groupe, 0.6, 0.73, 1, noyer, bx + dx, 0.365, bz);
  boite(groupe, 1.9, 0.5, 0.04, noyer, bx, 0.45, bz + 0.47);
  boite(groupe, 3.2, 0.02, 0.02, MAT.or, bx, 0.72, bz + 0.56);
  const e = ecran(MAGENTA, 0.9, 0.5);
  e.position.set(bx, 1.12, bz - 0.15);
  e.rotation.y = Math.PI;
  groupe.add(e);
  boite(groupe, 0.94, 0.54, 0.03, MAT.noir, bx, 1.12, bz - 0.13);
  boite(groupe, 0.06, 0.3, 0.06, MAT.noir, bx, 0.93, bz - 0.1);
  boite(groupe, 0.5, 0.02, 0.16, MAT.noir, bx, 0.8, bz - 0.35);
  cylindre(groupe, 0.1, 0.03, MAT.or, bx + 1.3, 0.8, bz - 0.2);
  cylindre(groupe, 0.015, 0.5, MAT.or, bx + 1.3, 1.05, bz - 0.2, 8);
  const abat = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.18, 20, 1, true),
    lumineux("#ffd28a", 1.6),
  );
  abat.position.set(bx + 1.3, 1.35, bz - 0.2);
  groupe.add(abat);
  const disque = cylindre(
    groupe,
    0.16,
    0.01,
    MAT.or,
    bx - 1.2,
    0.98,
    bz - 0.1,
    32,
  );
  disque.rotation.x = Math.PI / 2;
  boite(groupe, 0.05, 0.2, 0.05, MAT.noir, bx - 1.2, 0.86, bz - 0.12);

  const f = new THREE.Group();
  f.position.set(THEO.x, 0, THEO.z + 0.1);
  groupe.add(f);
  const cuir = std("#141015", { roughness: 0.4 });
  boite(f, 0.75, 0.14, 0.7, cuir, 0, 0.47, 0);
  boite(f, 0.78, 1.3, 0.14, cuir, 0, 1.15, -0.36);
  boite(f, 0.8, 0.04, 0.16, MAT.or, 0, 1.81, -0.36);
  for (const dx of [-0.38, 0.38]) boite(f, 0.1, 0.25, 0.6, cuir, dx, 0.66, 0);
  cylindre(f, 0.04, 0.4, MAT.alu, 0, 0.2, 0, 8);
  boite(f, 0.6, 0.03, 0.06, MAT.alu, 0, 0.03, 0);
  boite(f, 0.06, 0.03, 0.6, MAT.alu, 0, 0.03, 0);

  for (const dx of [-0.6, 0.6])
    chaise(
      groupe,
      "#3b2a22",
      OBSTACLES.visiteurs[0] + dx,
      OBSTACLES.visiteurs[1],
      0,
    );
  const lampe = new THREE.PointLight("#ffd28a", 22, 16);
  lampe.position.set(bx, 2.8, bz);
  groupe.add(lampe);
  return e;
}

export function penthouse(groupe, grille) {
  solForme(
    groupe,
    INTERIEUR,
    std("#ffffff", { map: marbre, roughness: 0.45, metalness: 0 }),
    0.01,
    4,
  );
  const panneau = std("#1a1620", { roughness: 0.7 });
  boite(groupe, 0.14, 3.2, 14, panneau, 2, 1.6, -3);
  boite(groupe, 14, 1, 0.14, panneau, 9, 0.5, 4);
  boite(groupe, 14, 0.03, 0.18, MAT.or, 9, 1.01, 4);
  for (const [x0, z0, x1, z1, portes] of [
    [2, -10, 15, -10],
    [15, -10, 16, -9],
    [16, -9, 16, 4, [[1.6, 2.8]]],
  ])
    mur(groupe, RIEN, x0, z0, x1, z1, { type: "verre", h: 3.2, portes });

  const ecranTheo = bureau(groupe);
  const [mx, mz, ml] = OBSTACLES.murEcrans;
  boite(groupe, ml, 2.95, 0.2, MAT.noir, mx, 1.67, mz);
  const ecrans = [
    [mx - 1.27, 2.0],
    [mx + 1.27, 2.0],
    [mx - 1.27, 0.85],
    [mx + 1.27, 0.85],
  ].map(([x, y]) => ecranMural(groupe, 2.45, 1.1, x, y, mz + 0.11, 512, 230));
  const haut = ecranMural(groupe, 5, 0.34, mx, 2.84, mz + 0.11, 1024, 70);

  const animerDecor = decor(groupe);
  const animerTerrasse = terrasse(groupe);
  titre(groupe, "Bureau de Théo", ZIK.or, 9, -5.2, "fondateur", 3.5);
  implanter(grille);

  let cle = null;
  const maj = (donnees) => {
    const a = panneaux(donnees);
    if (a.cle === cle) return;
    cle = a.cle;
    for (const [k, e] of ecrans.entries()) {
      dessiner(e.x, e.t.image.width, e.t.image.height, a.liste[k]);
      e.t.needsUpdate = true;
    }
    bandeau(haut.x, haut.t.image.width, haut.t.image.height, a.bandeau);
    haut.t.needsUpdate = true;
  };
  maj({});

  return {
    theo: { place: V(THEO.x, THEO.z), angle: THEO.angle, ecran: ecranTheo },
    pauses: PAUSES.map((p) => ({
      place: V(p.x, p.z),
      angle: p.angle,
      debout: p.debout,
    })),
    ecrans: [...ecrans, haut].map((e) => e.m),
    contour: CONTOUR,
    maj,
    animer(dt, t) {
      animerDecor(dt, t);
      animerTerrasse(dt, t);
      for (const e of ecrans)
        e.m.material.emissiveIntensity = 1.6 + Math.sin(t * 3) * 0.08;
    },
  };
}
