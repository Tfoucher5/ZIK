import * as THREE from "three";
import { MAT, boite, chaise, cylindre } from "./meubles.js";
import { Tele } from "./tele.js";

const mat = (c, o = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });

function groupe(scene, x, z, angle = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = angle;
  scene.add(g);
  return g;
}

function emprise(grille, x, z, l, p, angle, marge = 0.12) {
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  grille.bloquer(x, z, l * c + p * s, l * s + p * c, marge);
}

// Table de réunion, sièges des deux côtés, télé au mur. Renvoie sièges, télé et la place de l'animateur.
export function tableReunion(scene, grille, x, z, l, n, couleur, mural, nom) {
  boite(scene, l, 0.06, 1.2, MAT.chene, x, 0.74, z);
  for (const dx of [-l / 2 + 0.3, l / 2 - 0.3])
    boite(scene, 0.08, 0.72, 0.9, MAT.noir, x + dx, 0.36, z);
  grille.bloquer(x, z, l, 1.2, 0.1);
  grille.bloquer(x, z, l, 2.18, 0);
  const sieges = [];
  const par = Math.ceil(n / 2);
  for (let k = 0; k < n; k++) {
    const cote = k < par ? -1 : 1;
    const sx = x - l / 2 + (l / par) * ((k % par) + 0.5);
    const sz = z + cote * 0.85;
    chaise(scene, couleur, sx, sz, cote < 0 ? Math.PI : 0);
    sieges.push({
      place: new THREE.Vector3(sx, 0, sz),
      angle: cote < 0 ? 0 : Math.PI,
    });
  }
  const tele = new Tele(couleur, nom);
  tele.mesh.position.set(mural.x, 1.45, mural.z);
  tele.mesh.rotation.y = mural.angle;
  scene.add(tele.mesh);
  const cadre = boite(
    scene,
    1.68,
    0.98,
    0.04,
    MAT.noir,
    mural.x,
    1.45,
    mural.z,
  );
  cadre.rotation.y = mural.angle;
  cadre.translateZ(-0.03);
  const n2 = new THREE.Vector3(Math.sin(mural.angle), 0, Math.cos(mural.angle));
  return {
    sieges,
    tele,
    debout: {
      place: tele.mesh.position.clone().setY(0).addScaledVector(n2, 0.7),
      angle: mural.angle,
      debout: true,
    },
  };
}

export function bibliotheque(scene, grille, x, z, angle, l = 3) {
  const g = groupe(scene, x, z, angle);
  boite(g, l, 1.8, 0.4, MAT.chene, 0, 0.9, 0);
  const couleurs = [
    "#FF4F9A",
    "#5BC0EB",
    "#F4E04D",
    "#3DDC84",
    "#8C7BFF",
    "#FF8C42",
    "#f4f3f0",
    "#1f2937",
  ];
  for (let r = 0; r < 4; r++)
    for (let k = 0; k < Math.floor(l / 0.12) - 3; k++)
      if ((k + r * 3) % 7)
        boite(
          g,
          0.08,
          0.26 + ((k * 7 + r) % 4) * 0.02,
          0.28,
          mat(couleurs[(k + r) % 8]),
          -l / 2 + 0.2 + k * 0.12,
          0.3 + r * 0.42,
          0.08,
        );
  emprise(grille, x, z, l, 0.45, angle);
}

export function fauteuil(scene, grille, x, z, angle, couleur) {
  const g = groupe(scene, x, z, angle);
  const c = mat(couleur, { roughness: 1 });
  boite(g, 0.85, 0.4, 0.8, c, 0, 0.2, 0);
  boite(g, 0.85, 0.5, 0.18, c, 0, 0.6, 0.31);
  boite(g, 0.15, 0.25, 0.8, c, -0.35, 0.5, 0);
  boite(g, 0.15, 0.25, 0.8, c, 0.35, 0.5, 0);
  emprise(grille, x, z, 0.85, 0.8, angle, 0.05);
  return {
    place: new THREE.Vector3(
      x - 0.1 * Math.sin(angle),
      0,
      z - 0.1 * Math.cos(angle),
    ),
    angle: angle + Math.PI,
  };
}

// Table haute de cafétéria avec tabourets ; renvoie les places.
export function tableCafe(scene, grille, x, z, couleur) {
  boite(scene, 1.2, 0.05, 0.75, MAT.blanc, x, 0.92, z);
  boite(scene, 0.06, 0.9, 0.06, MAT.noir, x, 0.45, z);
  grille.bloquer(x, z, 1.2, 0.75, 0.1);
  const places = [];
  for (const [dx, dz] of [
    [-0.35, -0.6],
    [0.35, -0.6],
    [-0.35, 0.6],
    [0.35, 0.6],
  ]) {
    cylindre(scene, 0.17, 0.06, mat(couleur), x + dx, 0.66, z + dz, 12);
    cylindre(scene, 0.025, 0.64, MAT.noir, x + dx, 0.32, z + dz, 6);
    places.push({
      place: new THREE.Vector3(x + dx, 0, z + dz * 1.2),
      angle: dz < 0 ? 0 : Math.PI,
      debout: true,
    });
  }
  return places;
}

// Casque audio géant, la sculpture du salon.
export function casque(scene, grille, x, z, angle) {
  const g = groupe(scene, x, z, angle);
  const rose = mat("#c026d3", { roughness: 0.3, metalness: 0.3 });
  const arceau = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.08, 12, 32, Math.PI),
    rose,
  );
  arceau.position.y = 1.2;
  g.add(arceau);
  for (const s of [-1, 1])
    cylindre(g, 0.32, 0.25, MAT.noir, s * 0.75, 1.2, 0, 24).rotation.z =
      Math.PI / 2;
  cylindre(g, 0.5, 0.15, MAT.noir, 0, 0.08, 0, 24);
  boite(g, 0.06, 0.9, 0.06, MAT.alu, 0, 0.55, 0);
  grille.bloquer(x, z, 1.2, 1, 0.1);
}

// Mur végétal.
export function murVegetal(scene, x, z, angle, l, h = 2) {
  const g = groupe(scene, x, z, angle);
  boite(g, l, h, 0.06, mat("#2f5d34"), 0, 0.4 + h / 2, 0);
  const verts = [mat("#3d8b4d"), mat("#5aa35a"), mat("#2e7a43")];
  for (let k = 0; k < l * h * 9; k++) {
    const f = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.1 + Math.random() * 0.06, 0),
      verts[k % 3],
    );
    f.position.set((Math.random() - 0.5) * l, 0.45 + Math.random() * h, 0.06);
    g.add(f);
  }
}

export function poufs(scene, grille, x, z, couleurs) {
  couleurs.forEach((c, k) => {
    const a = (k / couleurs.length) * Math.PI * 2;
    cylindre(
      scene,
      0.28,
      0.42,
      mat(c, { roughness: 1 }),
      x + Math.cos(a) * 0.8,
      0.21,
      z + Math.sin(a) * 0.8,
      18,
    );
  });
  grille.bloquer(x, z, 2, 2, 0);
}
