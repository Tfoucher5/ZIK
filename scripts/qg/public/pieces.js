import * as THREE from "three";
import { MAT, boite, chaise, cylindre, ecran } from "./meubles.js";

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

// Table de réunion, sièges des deux côtés, écran au mur. Renvoie sièges, écran et la place de l'animateur.
export function tableReunion(scene, grille, x, z, l, n, couleur, mural) {
  boite(scene, l, 0.06, 1.2, MAT.chene, x, 0.74, z);
  for (const dx of [-l / 2 + 0.3, l / 2 - 0.3])
    boite(scene, 0.08, 0.72, 0.9, MAT.noir, x + dx, 0.36, z);
  grille.bloquer(x, z, l, 1.2, 0.15);
  const sieges = [];
  const par = Math.ceil(n / 2);
  for (let k = 0; k < n; k++) {
    const cote = k < par ? -1 : 1;
    const sx = x - l / 2 + (l / par) * ((k % par) + 0.5);
    const sz = z + cote * 0.95;
    chaise(scene, couleur, sx, sz, cote < 0 ? Math.PI : 0);
    sieges.push({
      place: new THREE.Vector3(sx, 0, sz),
      angle: cote < 0 ? 0 : Math.PI,
    });
  }
  const e = ecran(couleur, 1.6, 0.9);
  e.position.set(mural.x, 1.45, mural.z);
  e.rotation.y = mural.angle;
  scene.add(e);
  const n2 = new THREE.Vector3(Math.sin(mural.angle), 0, Math.cos(mural.angle));
  return {
    sieges,
    ecran: e,
    debout: {
      place: e.position.clone().setY(0).addScaledVector(n2, 0.7),
      angle: mural.angle,
      debout: true,
    },
  };
}

// Escalier en deux volées avec palier, vu d'en haut.
export function escalier(scene, x, z, l, p) {
  const g = groupe(scene, x, z);
  const marches = 12;
  for (let k = 0; k < marches; k++) {
    const pz = -p / 2 + 0.4 + (k * (p - 1.4)) / marches;
    boite(
      g,
      l / 2 - 0.15,
      0.15 + k * 0.17,
      (p - 1.4) / marches,
      MAT.beton,
      -l / 4,
      (0.15 + k * 0.17) / 2,
      pz,
    );
    boite(
      g,
      l / 2 - 0.15,
      2.2 - k * 0.17,
      (p - 1.4) / marches,
      MAT.beton,
      l / 4,
      (2.2 - k * 0.17) / 2,
      pz,
    );
  }
  boite(g, l - 0.1, 2.2, 1, MAT.beton, 0, 1.1, p / 2 - 0.6);
  boite(g, 0.08, 2.4, p - 1.2, MAT.alu, 0, 1.2, -0.2);
}

// Sanitaires : cabines alignées et vasques.
export function sanitaires(scene, x, z, l) {
  const g = groupe(scene, x, z);
  for (let k = 0; k < 3; k++) {
    const cx = -l / 2 + 0.55 + k * 1.05;
    boite(g, 0.04, 1.9, 1.3, mat("#9ca3af"), cx + 0.5, 0.95, -0.5);
    boite(g, 0.4, 0.4, 0.55, MAT.blanc, cx, 0.2, -0.85);
  }
  boite(g, l - 0.3, 0.12, 0.45, MAT.blanc, 0, 0.85, 0.65);
  for (let k = 0; k < 2; k++)
    cylindre(g, 0.15, 0.06, MAT.alu, -0.5 + k, 0.93, 0.65);
}

// Bloc ascenseurs : deux portes inox sur la face qui donne sur l'accueil.
export function ascenseurs(scene, x, z, l, p) {
  const g = groupe(scene, x, z);
  boite(g, l, 2.6, p, mat("#d4d4d8"), 0, 1.3, 0);
  for (const dx of [-l / 4, l / 4]) {
    boite(g, 1.1, 2.15, 0.04, MAT.alu, dx, 1.08, p / 2 + 0.02);
    boite(g, 0.02, 2.15, 0.05, MAT.noir, dx, 1.08, p / 2 + 0.03);
    boite(
      g,
      0.08,
      0.16,
      0.03,
      mat("#111", { emissive: "#ff00ff", emissiveIntensity: 0.6 }),
      dx + 0.75,
      1.2,
      p / 2 + 0.02,
    );
  }
}

// Cabine téléphonique acoustique pour une personne.
export function cabine(scene, grille, x, z, angle, couleur) {
  const g = groupe(scene, x, z, angle);
  const c = mat(couleur, { roughness: 1 });
  boite(g, 1.1, 2.2, 0.08, c, 0, 1.1, -0.5);
  boite(g, 0.08, 2.2, 1, c, -0.55, 1.1, 0);
  boite(g, 0.08, 2.2, 1, c, 0.55, 1.1, 0);
  boite(g, 1.1, 0.08, 1.1, c, 0, 2.2, 0);
  boite(g, 0.7, 0.05, 0.35, MAT.chene, 0, 0.95, -0.3);
  boite(g, 0.5, 0.45, 0.4, MAT.velours, 0, 0.23, 0.2);
  emprise(grille, x, z, 1.2, 1.1, angle);
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
