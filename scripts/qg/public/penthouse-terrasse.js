import * as THREE from "three";
import { MAT, boite, cylindre, mur, solForme, toile } from "./meubles.js";
import { OBSTACLES, TERRASSE } from "./penthouse-plan.js";

export const POLICE = '"Barlow Condensed", "Arial Narrow", sans-serif';
export const MAGENTA = "#FF2D95";
export const RIEN = { bloquer() {}, segment() {} };
export const lumineux = (c, i = 2, o = {}) =>
  new THREE.MeshStandardMaterial({
    color: c,
    emissive: c,
    emissiveIntensity: i,
    ...o,
  });

// Lettres Z, I, K (hauteur 1, en italique), à extruder.
const LETTRES = [
  [
    [0, 1],
    [0.8, 1],
    [0.8, 0.82],
    [0.27, 0.18],
    [0.8, 0.18],
    [0.8, 0],
    [0, 0],
    [0, 0.18],
    [0.53, 0.82],
    [0, 0.82],
  ],
  [
    [0.95, 0],
    [1.17, 0],
    [1.17, 1],
    [0.95, 1],
  ],
  [
    [1.35, 0],
    [1.57, 0],
    [1.57, 0.38],
    [1.67, 0.48],
    [1.93, 0],
    [2.19, 0],
    [1.82, 0.62],
    [2.15, 1],
    [1.89, 1],
    [1.57, 0.62],
    [1.57, 1],
    [1.35, 1],
  ],
];

// Logo ZIK en relief, centré en largeur, posé sur y = 0 du groupe renvoyé.
export function lettresZik(parent, taille, mat, profondeur = 0.15) {
  const g = new THREE.Group();
  for (const points of LETTRES) {
    const forme = new THREE.Shape(
      points.map(([x, y]) => new THREE.Vector2(x + y * 0.18 - 1.18, y)),
    );
    const m = new THREE.Mesh(
      new THREE.ExtrudeGeometry(forme, {
        depth: profondeur / taille,
        bevelEnabled: false,
      }),
      mat,
    );
    m.scale.setScalar(taille);
    g.add(m);
  }
  parent.add(g);
  return g;
}

const planches = toile(256, 256, (x) => {
  x.fillStyle = "#5a3b24";
  x.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 21) {
    x.fillStyle = `rgba(0,0,0,${0.15 + (y % 3) * 0.05})`;
    x.fillRect(0, y, 256, 2);
    x.fillStyle = `rgba(255,220,180,${0.04 + (y % 5) * 0.01})`;
    x.fillRect(0, y + 3, 256, 16);
  }
});
planches.wrapS = planches.wrapT = THREE.RepeatWrapping;

function transat(parent, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  const coussin = new THREE.MeshStandardMaterial({
    color: "#f4efe6",
    roughness: 1,
  });
  boite(g, 0.66, 0.08, 1.2, MAT.alu, 0, 0.3, -0.25);
  boite(g, 0.6, 0.08, 1.1, coussin, 0, 0.38, -0.25);
  boite(g, 0.6, 0.08, 0.7, coussin, 0, 0.6, 0.55).rotation.x = 0.75;
  for (const dx of [-0.3, 0.3])
    for (const dz of [-0.8, 0.7])
      boite(g, 0.04, 0.3, 0.04, MAT.alu, dx, 0.15, dz);
  cylindre(g, 0.2, 0.04, MAT.blanc, 0.6, 0.45, 0.3);
  cylindre(g, 0.03, 0.45, MAT.alu, 0.6, 0.22, 0.3, 8);
}

// Toit-terrasse : deck, garde-corps de verre, transats, jacuzzi et enseigne ZIK géante sur le toit.
export function terrasse(groupe) {
  solForme(
    groupe,
    TERRASSE,
    new THREE.MeshStandardMaterial({ map: planches, roughness: 0.8 }),
    0.01,
    2,
  );
  for (const [x0, z0, x1, z1] of [
    [16, -9, 21, -4],
    [21, -4, 21, 4],
    [16, 4, 21, 4],
  ])
    mur(groupe, RIEN, x0, z0, x1, z1, { type: "verre", h: 1.1 });

  for (const id of ["transat1", "transat2"])
    transat(groupe, OBSTACLES[id][0], OBSTACLES[id][1]);

  const [jx, jz] = OBSTACLES.jacuzzi;
  cylindre(groupe, 1.15, 0.5, MAT.noir, jx, 0.25, jz, 40);
  cylindre(groupe, 1.2, 0.05, MAT.or, jx, 0.51, jz, 40);
  const eau = cylindre(
    groupe,
    1.02,
    0.04,
    lumineux("#22d3ee", 1.8, { transparent: true, opacity: 0.9 }),
    jx,
    0.5,
    jz,
    40,
  );
  const bulles = [];
  for (let k = 0; k < 14; k++) {
    const b = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 6, 4),
      lumineux("#e0fbff", 1.5),
    );
    const a = k * 2.4;
    const r = 0.2 + ((k * 37) % 70) / 100;
    b.position.set(jx + Math.cos(a) * r, 0.53, jz + Math.sin(a) * r);
    groupe.add(b);
    bulles.push(b);
  }
  const lueur = new THREE.PointLight("#22d3ee", 6, 5);
  lueur.position.set(jx, 1, jz);
  groupe.add(lueur);

  // L'enseigne sur le toit, au-dessus de la baie nord, face à la ville.
  const enseigne = lumineux(MAGENTA, 2.5);
  for (const x of [6.3, 9, 11.7]) {
    boite(groupe, 0.1, 1.2, 0.1, MAT.noir, x, 3.8, -9.75);
    boite(groupe, 0.1, 0.1, 0.9, MAT.noir, x, 3.25, -9.4);
  }
  boite(groupe, 6, 0.1, 0.1, MAT.noir, 9, 3.35, -9.75);
  const lettres = lettresZik(groupe, 2.6, enseigne, 0.3);
  lettres.position.set(9, 3.45, -9.85);
  const halo = new THREE.PointLight(MAGENTA, 30, 14);
  halo.position.set(9, 4.6, -8.2);
  groupe.add(halo);

  return (dt, t) => {
    const panne = Math.sin(t * 13.7) > 0.985;
    enseigne.emissiveIntensity = panne ? 0.6 : 2.4 + Math.sin(t * 2) * 0.5;
    halo.intensity = panne ? 8 : 30;
    eau.material.emissiveIntensity = 1.6 + Math.sin(t * 1.3) * 0.3;
    for (const [k, b] of bulles.entries())
      b.position.y = 0.53 + ((t * 0.4 + k * 0.17) % 1) * 0.12;
  };
}
