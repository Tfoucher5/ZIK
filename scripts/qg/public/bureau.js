import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

export const COULEURS = {
  ceo: "#f5c542",
  argent: "#ffd166",
  operations: "#ff9f43",
  produit: "#b388ff",
  tech: "#4dabf7",
  marketing: "#ff6b9d",
  board: "#ff5252",
  renforts: "#8892a6",
};

export const ZONES = {
  tech: new THREE.Vector3(-20, 0, -9),
  argent: new THREE.Vector3(20, 0, -9),
  produit: new THREE.Vector3(-20, 0, 10),
  marketing: new THREE.Vector3(20, 0, 10),
  operations: new THREE.Vector3(0, 0, 10),
  renforts: new THREE.Vector3(-20, 0, 21),
};

const mat = (couleur, extra = {}) =>
  new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.6, ...extra });
const MATS = {
  sol: mat("#14181f", { roughness: 0.35, metalness: 0.2 }),
  bois: mat("#c9a27a", { roughness: 0.5 }),
  blanc: mat("#e9edf2", { roughness: 0.4 }),
  noir: mat("#1d2230", { roughness: 0.4, metalness: 0.4 }),
  verre: new THREE.MeshStandardMaterial({
    color: "#9fd3ff",
    transparent: true,
    opacity: 0.12,
    roughness: 0.05,
  }),
  feuille: mat("#2f9e60"),
  pot: mat("#e8e2d6"),
};

function boite(l, h, p, materiau, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), materiau);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function etiquette(texte, couleur, classe = "zone") {
  const div = document.createElement("div");
  div.className = classe;
  div.textContent = texte;
  div.style.setProperty("--c", couleur);
  return new CSS2DObject(div);
}

// Un bureau avec écran et chaise. Renvoie la place assise (position + orientation) et l'écran.
export function poste(scene, x, z, angle, couleur) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = angle;
  scene.add(g);
  boite(1.9, 0.08, 0.95, MATS.blanc, 0, 0.76, 0, g);
  for (const [lx, lz] of [
    [-0.85, -0.4],
    [0.85, -0.4],
    [-0.85, 0.4],
    [0.85, 0.4],
  ])
    boite(0.05, 0.76, 0.05, MATS.noir, lx, 0.38, lz, g);
  boite(0.06, 0.32, 0.06, MATS.noir, 0, 0.95, -0.3, g);
  boite(0.95, 0.55, 0.05, MATS.noir, 0, 1.33, -0.32, g);
  const ecran = new THREE.Mesh(
    new THREE.PlaneGeometry(0.88, 0.48),
    new THREE.MeshStandardMaterial({
      color: "#0b0f18",
      emissive: new THREE.Color(couleur),
      emissiveIntensity: 0.08,
    }),
  );
  ecran.position.set(0, 1.33, -0.29);
  g.add(ecran);
  boite(0.5, 0.06, 0.18, MATS.noir, 0, 0.8, 0.12, g);
  const chaise = new THREE.Group();
  chaise.position.set(0, 0, 0.85);
  g.add(chaise);
  boite(0.55, 0.08, 0.55, mat(couleur, { roughness: 0.8 }), 0, 0.5, 0, chaise);
  boite(
    0.55,
    0.6,
    0.08,
    mat(couleur, { roughness: 0.8 }),
    0,
    0.85,
    0.27,
    chaise,
  );
  boite(0.06, 0.45, 0.06, MATS.noir, 0, 0.25, 0, chaise);
  const place = new THREE.Vector3(0, 0, 0.85)
    .applyMatrix4(new THREE.Matrix4().makeRotationY(angle))
    .add(g.position);
  return { place, angle: angle + Math.PI, ecran };
}

function plante(scene, x, z, taille = 1) {
  boite(
    0.5 * taille,
    0.6 * taille,
    0.5 * taille,
    MATS.pot,
    x,
    0.3 * taille,
    z,
    scene,
  );
  const f = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.6 * taille, 1),
    MATS.feuille,
  );
  f.position.set(x, 1.05 * taille, z);
  f.castShadow = true;
  scene.add(f);
}

function piece(scene, cx, cz, l, p, porte) {
  const h = 2.6;
  const murs = [
    [cx, cz - p / 2, l, 0.06],
    [cx - l / 2, cz, 0.06, p],
    [cx + l / 2, cz, 0.06, p],
  ];
  const demi = (l - porte) / 2;
  murs.push(
    [cx - l / 2 + demi / 2, cz + p / 2, demi, 0.06],
    [cx + l / 2 - demi / 2, cz + p / 2, demi, 0.06],
  );
  for (const [x, z, lx, lz] of murs) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(lx, h, lz), MATS.verre);
    m.position.set(x, h / 2, z);
    scene.add(m);
    const bord = new THREE.LineSegments(
      new THREE.EdgesGeometry(m.geometry),
      new THREE.LineBasicMaterial({
        color: "#7fb8e6",
        transparent: true,
        opacity: 0.5,
      }),
    );
    bord.position.copy(m.position);
    scene.add(bord);
  }
}

function tapis(scene, centre, l, p, couleur) {
  const t = new THREE.Mesh(
    new THREE.PlaneGeometry(l, p),
    mat(couleur, { transparent: true, opacity: 0.16 }),
  );
  t.rotation.x = -Math.PI / 2;
  t.position.set(centre.x, 0.01, centre.z);
  t.receiveShadow = true;
  scene.add(t);
}

// Postes d'un service : l'équipe en rangées de 3 face au chef.
export function service(scene, id, nom, equipe, extra = 2) {
  const c = ZONES[id];
  const couleur = COULEURS[id];
  const n = equipe.length + extra;
  const rangees = Math.ceil(n / 3);
  tapis(scene, c, 11, 4 + rangees * 3.2, couleur);
  const lab = etiquette(nom, couleur);
  lab.position.set(c.x, 4, c.z - (rangees * 3.2) / 2 - 2);
  scene.add(lab);
  const chef = poste(
    scene,
    c.x,
    c.z - (rangees * 3.2) / 2 - 0.2,
    Math.PI,
    couleur,
  );
  const postes = [];
  for (let i = 0; i < n; i++) {
    const x = c.x + ((i % 3) - 1) * 3.4;
    const z = c.z - (rangees * 3.2) / 2 + 2.6 + Math.floor(i / 3) * 3.2;
    postes.push(poste(scene, x, z, 0, couleur));
  }
  plante(scene, c.x + 5.2, c.z - (rangees * 3.2) / 2 - 0.6);
  return { chef, postes };
}

export function decor(scene) {
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(64, 50), MATS.sol);
  sol.rotation.x = -Math.PI / 2;
  sol.receiveShadow = true;
  scene.add(sol);
  const grille = new THREE.GridHelper(64, 32, "#1f2a3d", "#182131");
  grille.position.y = 0.005;
  scene.add(grille);
  for (const [x, z, l, p] of [
    [0, -25, 64, 0.3],
    [-32, 0, 0.3, 50],
    [32, 0, 0.3, 50],
  ])
    boite(l, 3, p, MATS.noir, x, 1.5, z, scene);

  // Bureau du CEO (Théo à côté) et salle du board, vitrés
  piece(scene, 0, -19, 12, 8, 2.4);
  const lab = etiquette("Direction", COULEURS.ceo);
  lab.position.set(0, 3.4, -23);
  scene.add(lab);
  const ceo = poste(scene, -2.2, -20.5, 0, COULEURS.ceo);
  const theo = poste(scene, 2.2, -20.5, 0, "#ffffff");
  plante(scene, 5, -22, 1.2);

  piece(scene, 0, -8, 13, 8, 2.4);
  const labB = etiquette("Salle du board", COULEURS.board);
  labB.position.set(0, 3.4, -12);
  scene.add(labB);
  boite(7.5, 0.1, 2.2, MATS.bois, 0, 0.78, -8, scene);
  boite(0.3, 0.75, 1.4, MATS.noir, 0, 0.38, -8, scene);
  const sieges = [];
  for (let i = 0; i < 7; i++) {
    if (i === 6)
      sieges.push({
        place: new THREE.Vector3(-4.6, 0, -8),
        angle: Math.PI / 2,
      });
    else
      sieges.push({
        place: new THREE.Vector3(-2.8 + (i % 3) * 2.8, 0, i < 3 ? -9.7 : -6.3),
        angle: i < 3 ? 0 : Math.PI,
      });
  }
  const mur = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 1.6),
    new THREE.MeshStandardMaterial({
      color: "#0b0f18",
      emissive: new THREE.Color(COULEURS.board),
      emissiveIntensity: 0.1,
    }),
  );
  mur.position.set(0, 1.7, -11.9);
  scene.add(mur);

  // Coin café et salon
  const cafe = new THREE.Vector3(9, 0, 19);
  boite(3.2, 1, 0.8, MATS.bois, cafe.x, 0.5, cafe.z + 1.5, scene);
  boite(0.6, 0.7, 0.5, MATS.noir, cafe.x - 0.8, 1.35, cafe.z + 1.5, scene);
  boite(3.5, 0.45, 1.2, mat("#3b4a6b"), cafe.x + 6, 0.25, cafe.z, scene);
  boite(3.5, 0.6, 0.3, mat("#3b4a6b"), cafe.x + 6, 0.6, cafe.z + 0.6, scene);
  plante(scene, cafe.x + 9, cafe.z + 1.4, 1.3);
  plante(scene, -29, -22, 1.4);
  plante(scene, 29, -22, 1.4);
  const labC = etiquette("Café", "#c9a27a");
  labC.position.set(cafe.x + 2, 2.6, cafe.z + 1.5);
  scene.add(labC);
  const pauses = [
    new THREE.Vector3(cafe.x - 0.8, 0, cafe.z + 0.6),
    new THREE.Vector3(cafe.x + 0.6, 0, cafe.z + 0.4),
    new THREE.Vector3(cafe.x + 5, 0, cafe.z - 1),
    new THREE.Vector3(cafe.x + 7, 0, cafe.z - 1),
    new THREE.Vector3(-2, 0, 0),
    new THREE.Vector3(6, 0, -1),
  ];
  const invite = {
    place: new THREE.Vector3(cafe.x + 6, 0, cafe.z - 0.2),
    angle: Math.PI,
  };
  const avocat = poste(scene, 11.5, -15, -Math.PI / 2, COULEURS.board);
  return { ceo, theo, sieges, pauses, invite, avocat, ecranBoard: mur };
}
