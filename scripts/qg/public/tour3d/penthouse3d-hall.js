// Hall of Fame : mur de pochettes hommage, disques d'or, affiches ZIK, juke-box, platines, micro d'or, lustre de disques.
import * as THREE from "three";
import { ALBUMS } from "./penthouse3d-albums.js";
import { P, bloc, boule, plaque, texture, tube } from "./penthouse3d-base.js";
import { lueur, mat } from "./mobilier-base.js";

function ajuste(x, t, max, taille, gras = "bold") {
  let s = taille;
  do x.font = `${gras} ${s--}px Arial, sans-serif`;
  while (x.measureText(t).width > max && s > 10);
}

// Une composition par motif, variée par le rang de l'album : rien n'imite la vraie pochette.
const MOTIFS = [
  (x, a, i) => {
    for (let r = 120; r > 8; r -= 14 + (i % 3) * 4) {
      x.beginPath();
      x.arc(128 + (i % 5) * 6 - 12, 140, r, 0, 7);
      x.strokeStyle = a.encre;
      x.lineWidth = 3 + (i % 4);
      x.stroke();
    }
  },
  (x, a, i) => {
    x.save();
    x.translate(128, 128);
    x.rotate(((i % 4) - 1.5) * 0.4);
    x.fillStyle = a.encre;
    for (let k = -6; k < 6; k += 2) x.fillRect(-200, k * 22, 400, 18);
    x.restore();
  },
  (x, a, i) => {
    x.fillStyle = a.encre;
    x.font = `900 ${200 + (i % 3) * 30}px Georgia, serif`;
    x.textAlign = "center";
    x.fillText(a.artiste[0], 140 - (i % 4) * 10, 230);
    x.textAlign = "left";
  },
  (x, a, i) => {
    x.fillStyle = a.encre;
    for (let u = 0; u < 9; u++)
      for (let v = 0; v < 9; v++) {
        x.beginPath();
        x.arc(14 + u * 29, 14 + v * 29, 2 + ((u + v + i) % 6) * 1.6, 0, 7);
        x.fill();
      }
  },
  (x, a, i) => {
    x.fillStyle = a.encre;
    x.beginPath();
    x.arc(128, 200, 90 + (i % 3) * 10, Math.PI, 0);
    x.fill();
    x.fillStyle = a.fond;
    for (let y = 130; y < 200; y += 14) x.fillRect(20, y, 216, 5);
  },
  (x, a, i) => {
    x.strokeStyle = a.encre;
    x.lineWidth = 6;
    x.translate(128, 136);
    for (let k = 0; k < 6; k++) {
      x.rotate(0.12 + (i % 3) * 0.05);
      const s = 200 - k * 30;
      x.strokeRect(-s / 2, -s / 2, s, s);
    }
    x.setTransform(1, 0, 0, 1, 0, 0);
  },
];

const pochette = (i) =>
  texture(`album-${i}`, 256, 256, (x) => {
    const a = ALBUMS[i];
    x.fillStyle = a.fond;
    x.fillRect(0, 0, 256, 256);
    MOTIFS[a.motif](x, a, i);
    x.fillStyle = a.fond;
    x.fillRect(0, 0, 256, 44);
    x.fillRect(0, 206, 256, 50);
    x.fillStyle = a.encre;
    ajuste(x, a.artiste.toUpperCase(), 232, 30);
    x.fillText(a.artiste.toUpperCase(), 12, 33);
    ajuste(x, a.titre, 232, 24, "italic 600");
    x.fillText(a.titre, 12, 238);
  });

const ecrit = (cle, l, h, lignes) =>
  texture(cle, l, h, (x) => {
    x.fillStyle = "#0b0a0c";
    x.fillRect(0, 0, l, h);
    x.textAlign = "center";
    for (const [t, y, taille, couleur] of lignes) {
      x.fillStyle = couleur;
      ajuste(x, t, l - 20, taille);
      x.fillText(t, l / 2, y);
    }
  });

const OR = "#e3b341";
const MAG = "#d61fd6";
const peint = (map, i = 0.3) =>
  new THREE.MeshStandardMaterial({
    map,
    emissiveMap: map,
    emissive: "#ffffff",
    emissiveIntensity: i,
    roughness: 0.5,
  });
const PLAQUE = peint(ecrit("plaque", 256, 40, [["HALL OF FAME", 29, 24, OR]]));
const BANDEAU = peint(
  ecrit("bandeau", 1024, 128, [["HALL OF FAME", 92, 84, OR]]),
  0.6,
);
const COUVERTURES = ALBUMS.map((_, i) => peint(pochette(i), 0.35));
const AFFICHES = [
  ["ZIK SOIRÉE", "Blind test géant", MAG],
  ["ZIK SOIRÉE", "Spécial rap FR", OR],
  ["ZIK SOIRÉE", "Années 2000", "#3ddcf0"],
].map(([a, b, c], i) =>
  peint(
    ecrit(`affiche-${i}`, 256, 360, [
      [a, 90, 46, c],
      ["♪", 210, 110, c],
      [b, 320, 30, "#f5f5f5"],
    ]),
    0.45,
  ),
);

function cadre(g, l, h, x, y, z, m) {
  bloc(g, l + 0.16, h + 0.16, 0.03, P.or, x, y, z + 0.01);
  bloc(g, l + 0.1, h + 0.1, 0.05, P.noir, x, y, z + 0.03);
  plaque(g, l, h, m, x, y, z + 0.06);
}

export const HALL = {
  "p-mur-albums": (g, { l }, c) => {
    const cols = 6;
    const rangs = Math.ceil(ALBUMS.length / cols);
    const pas = l / cols;
    const s = pas * 0.74;
    const haut = Math.min(c.hauteur - 0.4, 6);
    bloc(g, l, haut, 0.04, P.noyer, 0, haut / 2, -0.02);
    ALBUMS.forEach((_, i) => {
      const x = -l / 2 + pas * ((i % cols) + 0.5);
      const y = 1.3 + Math.floor(i / cols) * ((haut - 2.1) / (rangs - 1));
      cadre(g, s, s, x, y, 0, COUVERTURES[i]);
      plaque(g, s * 0.7, s * 0.11, PLAQUE, x, y - s / 2 - 0.16, 0.03);
    });
    plaque(g, l * 0.55, l * 0.069, BANDEAU, 0, haut - 0.3, 0.02);
  },
  "p-disques-or": (g, { l }) => {
    const n = Math.floor(l / 0.95);
    for (let i = 0; i < n * 2; i++) {
      const x = -l / 2 + ((i % n) + 0.5) * (l / n);
      const y = i < n ? 1.5 : 2.6;
      bloc(g, 0.64, 0.84, 0.04, P.noir, x, y, 0.03);
      tube(g, 0.24, 0.01, P.or, x, y + 0.06, 0.06, 1, 32).rotation.x =
        Math.PI / 2;
      tube(g, 0.05, 0.012, P.noir, x, y + 0.06, 0.065, 1, 12).rotation.x =
        Math.PI / 2;
      plaque(g, 0.4, 0.06, PLAQUE, x, y - 0.3, 0.055);
    }
  },
  "p-affiches": (g, { l }) => {
    const n = Math.max(1, Math.floor(l / 1));
    for (let i = 0; i < n; i++)
      cadre(g, 0.7, 1, -l / 2 + (i + 0.5) * (l / n), 1.6, 0, AFFICHES[i % 3]);
  },
  "p-juke-box": (g, { l, q }) => {
    const h = 1.5;
    bloc(g, l, h, q, P.noyer, 0, h / 2, 0, true);
    const arc = tube(g, l / 2, q, P.noyer, 0, h, 0, 1, 24);
    arc.rotation.x = Math.PI / 2;
    ["#ff4d6d", "#ffbe0b", "#3ddcf0", "#9b5de5"].forEach((col, i) =>
      bloc(
        g,
        0.05,
        h - 0.2,
        0.03,
        lueur(col, 1.6),
        (i - 1.5) * 0.12 * l,
        h / 2,
        q / 2,
      ),
    );
    bloc(g, l * 0.7, 0.35, 0.02, P.verre, 0, 1.05, q / 2 + 0.01);
    bloc(g, l * 0.6, 0.25, 0.02, P.lumiere, 0, 1.05, q / 2 - 0.01);
  },
  "p-cabine-dj": (g, { l, q }) => {
    bloc(g, l, 1, q, P.noir, 0, 0.5, 0, true);
    bloc(g, l, 0.06, q * 0.4, P.magenta, 0, 0.6, q / 2 + 0.01);
    for (const s of [-1, 1]) {
      tube(g, 0.16, 0.03, P.noir, (s * l) / 3.2, 1.03, 0, 1, 24);
      tube(
        g,
        0.15,
        0.01,
        mat("#141414", { roughness: 0.3 }),
        (s * l) / 3.2,
        1.05,
        0,
        1,
        24,
      );
      bloc(
        g,
        0.22,
        0.45,
        0.25,
        P.noir,
        (s * l) / 2 - s * 0.12,
        1.23,
        -q / 2 + 0.13,
      );
    }
    bloc(g, 0.3, 0.06, 0.32, mat("#2a2a30"), 0, 1.03, 0);
  },
  "p-bac-vinyles": (g, { l, q }) => {
    bloc(g, l, 0.7, q, P.noyer, 0, 0.35, 0, true);
    const couleurs = ALBUMS.map((a) => mat(a.fond));
    for (let i = 0; i < 12; i++)
      bloc(
        g,
        0.31,
        0.31,
        0.01,
        couleurs[i * 2],
        (i % 2 ? 0.08 : -0.08) * l,
        0.85,
        -q / 2 + 0.08 + (i * (q - 0.16)) / 11,
      );
  },
  "p-micro-or": (g, { r }) => {
    tube(g, r, 0.5, P.noir, 0, 0.25, 0, 1.1, 32);
    tube(g, 0.07, 2.2, P.or, 0, 1.6, 0);
    boule(g, 0.75, 1.05, 0.75, P.or, 0, 3.1, 0);
    const bague = new THREE.Mesh(
      new THREE.TorusGeometry(0.39, 0.05, 10, 32),
      P.or,
    );
    bague.position.y = 2.95;
    bague.rotation.x = Math.PI / 2;
    g.add(bague);
    boule(
      g,
      0.7,
      0.7,
      0.7,
      mat("#8a6a1a", { metalness: 1, roughness: 0.5, wireframe: true }),
      0,
      3.3,
      0,
    );
  },
  "p-lustre-disques": (g, { r }, c) => {
    const h = c.hauteur;
    const corps = new THREE.Group();
    g.add(corps);
    const anneau = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.04, 8, 48),
      P.or,
    );
    anneau.position.y = h - 0.2;
    anneau.rotation.x = Math.PI / 2;
    corps.add(anneau);
    for (let i = 0; i < 40; i++) {
      const a = i * 2.4;
      const d = r * Math.sqrt((i + 1) / 40);
      const y = h - 0.9 - (i % 8) * 0.32;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      bloc(corps, 0.006, h - 0.2 - y, 0.006, P.or, x, (h - 0.2 + y) / 2, z);
      const disque = tube(corps, 0.17, 0.012, P.or, x, y, z, 1, 24);
      disque.rotation.set(Math.PI / 2, 0, a);
    }
    c.anime((dt) => (corps.rotation.y += dt * 0.08));
  },
};
