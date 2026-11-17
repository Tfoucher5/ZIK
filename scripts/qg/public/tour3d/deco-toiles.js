// Textures canvas de la déco (affiches, disques d'or, néons…), dessinées une fois et gardées en cache.
import { toile } from "../meubles.js";
import { ZIK } from "../deco.js";

const POLICE = '"Barlow Condensed", "Arial Narrow", sans-serif';
const EQUIPES = ["#FF4F9A", "#5BC0EB", "#F4E04D", "#3DDC84", "#8C7BFF"];
const cache = new Map();

export function toileDeco(cle, l, h, dessin) {
  if (!cache.has(cle)) cache.set(cle, toile(l, h, dessin));
  return cache.get(cle);
}

const fond = (c, w, h, couleur) => {
  c.fillStyle = couleur;
  c.fillRect(0, 0, w, h);
};
const cadre = (c, w, h, couleur = "#111", e = 14) => {
  c.strokeStyle = couleur;
  c.lineWidth = e;
  c.strokeRect(e / 2, e / 2, w - e, h - e);
};
const ecrire = (
  c,
  t,
  x,
  y,
  taille,
  couleur,
  poids = 800,
  aligne = "center",
) => {
  c.font = `italic ${poids} ${taille}px ${POLICE}`;
  c.textAlign = aligne;
  c.fillStyle = couleur;
  c.fillText(t, x, y);
};

// Affiches de soirées ZIK : lieux et dates inventés.
const SOIREES = [
  ["VEN 14 NOV", "Le Comptoir · Nantes", ZIK.magenta],
  ["SAM 22 NOV", "Camping Les Pins · Royan", "#1d4ed8"],
  ["JEU 4 DÉC", "Bar Le 109 · Lyon", "#0f766e"],
  ["SAM 13 DÉC", "Salle des fêtes · Vertou", "#b45309"],
  ["VEN 9 JAN", "Le Phare · Brest", "#7c3aed"],
];
export const PEINTURES = {
  affiche: (n) => (c, w, h) => {
    const [date, lieu, teinte] = SOIREES[n % SOIREES.length];
    fond(c, w, h, ZIK.nuit);
    for (let k = 0; k < 12; k++) {
      const v = 40 + Math.abs(Math.sin(k * 1.7 + n)) * 150;
      c.fillStyle = EQUIPES[(k + n) % EQUIPES.length];
      c.fillRect(18 + k * 19, 250 - v, 13, v);
    }
    c.fillStyle = teinte;
    c.fillRect(0, 262, w, 90);
    ecrire(c, "ZIK SOIRÉE", w / 2, 52, 52, "#fff", 900);
    ecrire(c, "BLIND TEST", w / 2, 300, 40, "#fff", 900);
    ecrire(c, date, w / 2, 336, 26, ZIK.or);
    ecrire(c, lieu, w / 2, 80, 20, "#e5e7eb", 600);
    cadre(c, w, h, "#0b0b10", 10);
  },
  "disque-or": () => (c, w, h) => {
    fond(c, w, h, "#1c1917");
    const g = c.createRadialGradient(w / 2, 120, 10, w / 2, 120, 100);
    g.addColorStop(0, "#fff3b0");
    g.addColorStop(1, "#b7791f");
    c.fillStyle = g;
    c.beginPath();
    c.arc(w / 2, 120, 96, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "rgba(0,0,0,.25)";
    for (let r = 40; r < 96; r += 8) {
      c.beginPath();
      c.arc(w / 2, 120, r, 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = ZIK.magenta;
    c.beginPath();
    c.arc(w / 2, 120, 26, 0, Math.PI * 2);
    c.fill();
    ecrire(c, "DISQUE D'OR", w / 2, 262, 30, ZIK.or);
    ecrire(c, "ZIK · 100 000 parties", w / 2, 292, 18, "#d6d3d1", 600);
    cadre(c, w, h, "#a16207", 12);
  },
  partie: () => (c, w, h) => {
    fond(c, w, h, ZIK.nuit);
    ecrire(c, "MANCHE 7 / 20", 40, 70, 44, ZIK.or, 800, "left");
    ecrire(c, "ZIK", w - 40, 74, 60, ZIK.neon, 900, "right");
    ecrire(c, "Trouvez le titre et l'artiste !", w / 2, 170, 64, "#fff", 900);
    c.fillStyle = "#2a2a3d";
    c.fillRect(60, 210, w - 120, 22);
    c.fillStyle = ZIK.magenta;
    c.fillRect(60, 210, (w - 120) * 0.62, 22);
    ["Les Disquaires", "Team Vinyle", "Les Platines", "Fa Si La"].forEach(
      (t, k) => {
        const v = [0.9, 0.72, 0.55, 0.4][k];
        c.fillStyle = EQUIPES[k];
        c.fillRect(220, 270 + k * 48, (w - 420) * v, 34);
        ecrire(c, t, 210, 297 + k * 48, 28, "#fff", 700, "right");
      },
    );
  },
  neon: (t) => (c, w, h) => {
    fond(c, w, h, "#09090f");
    c.shadowColor = ZIK.neon;
    c.shadowBlur = 30;
    ecrire(c, t, w / 2, h * 0.68, h * 0.55, "#ffd9ff", 900);
    c.shadowBlur = 0;
  },
  logo: () => (c, w, h) => {
    fond(c, w, h, ZIK.nuit);
    c.shadowColor = ZIK.neon;
    c.shadowBlur = 40;
    ecrire(c, "ZIK", w / 2, 270, 280, "#ffd9ff", 900);
    c.shadowBlur = 0;
    ecrire(
      c,
      "LE BLIND TEST QUI FAIT LA SOIRÉE",
      w / 2,
      340,
      40,
      ZIK.neon,
      700,
    );
  },
  onair: () => (c, w, h) => {
    fond(c, w, h, "#7f1d1d");
    c.shadowColor = "#ff4040";
    c.shadowBlur = 24;
    ecrire(c, "ON AIR", w / 2, h * 0.72, h * 0.62, "#fff1f1", 900);
    c.shadowBlur = 0;
    cadre(c, w, h, "#1f1f1f", 10);
  },
  tableau: () => (c, w, h) => {
    fond(c, w, h, "#f8fafc");
    ecrire(c, "CETTE SEMAINE", 30, 56, 42, "#0f172a", 900, "left");
    [
      ["Soirées jouées", "42", "#16a34a"],
      ["Joueurs", "1 380", "#0f172a"],
      ["Incidents", "0", "#16a34a"],
      ["Note des organisateurs", "4,8 / 5", ZIK.magenta],
    ].forEach(([t, v, couleur], k) => {
      ecrire(c, t, 30, 120 + k * 50, 30, "#334155", 600, "left");
      ecrire(c, v, w - 30, 120 + k * 50, 36, couleur, 900, "right");
    });
    cadre(c, w, h, "#94a3b8", 8);
  },
  postit: () => (c, w, h) => {
    fond(c, w, h, "#e7e5e4");
    const couleurs = ["#fde047", "#f9a8d4", "#86efac", "#7dd3fc", "#fdba74"];
    for (let i = 0; i < 9; i++)
      for (let j = 0; j < 4; j++) {
        if ((i * 7 + j * 3) % 5 === 0) continue;
        const [x, y] = [24 + i * 54, 20 + j * 58];
        c.fillStyle = couleurs[(i + j * 2) % 5];
        c.fillRect(x, y, 44, 44);
        c.fillStyle = "rgba(30,30,30,.55)";
        for (let k = 0; k < 3; k++)
          c.fillRect(x + 5, y + 10 + k * 10, 18 + ((i + k) % 3) * 7, 2);
      }
  },
  maquettes: () => (c, w, h) => {
    fond(c, w, h, "#f5f5f4");
    for (let k = 0; k < 6; k++) {
      const x = 22 + k * 80;
      c.fillStyle = "#111";
      c.fillRect(x, 40, 60, 120);
      c.fillStyle = k % 2 ? ZIK.nuit : "#1e1b4b";
      c.fillRect(x + 5, 48, 50, 104);
      c.fillStyle = EQUIPES[k % EQUIPES.length];
      c.fillRect(x + 10, 120, 40, 18);
      ecrire(c, "ZIK", x + 30, 80, 18, ZIK.neon, 900);
    }
    ecrire(c, "Écran joueur · v4", w / 2, 200, 22, "#44403c", 600);
  },
  partition: () => (c, w, h) => {
    fond(c, w, h, "#fdf6e3");
    c.strokeStyle = "#292524";
    c.lineWidth = 1.5;
    for (let p = 0; p < 6; p++)
      for (let l = 0; l < 5; l++) {
        const y = 40 + p * 46 + l * 6;
        c.beginPath();
        c.moveTo(16, y);
        c.lineTo(w - 16, y);
        c.stroke();
      }
    c.fillStyle = "#292524";
    for (let p = 0; p < 6; p++)
      for (let k = 0; k < 8; k++) {
        c.beginPath();
        c.ellipse(
          34 + k * 24,
          46 + p * 46 + ((k * 5 + p) % 5) * 4,
          4,
          3,
          -0.4,
          0,
          Math.PI * 2,
        );
        c.fill();
      }
    cadre(c, w, h, "#78350f", 12);
  },
  cassettes: () => (c, w, h) => {
    fond(c, w, h, "#3f2d20");
    for (let r = 0; r < 3; r++) {
      c.fillStyle = "#2a1d14";
      c.fillRect(0, 70 + r * 80, w, 8);
      for (let k = 0; k < 9; k++) {
        c.fillStyle = "#111";
        c.fillRect(10 + k * 55, 14 + r * 80, 48, 56);
        c.fillStyle = EQUIPES[(k + r) % EQUIPES.length];
        c.fillRect(14 + k * 55, 18 + r * 80, 40, 14);
      }
    }
  },
  ampli: () => (c, w, h) => {
    fond(c, w, h, "#1c1917");
    c.fillStyle = "#3a332c";
    for (let y = 8; y < h; y += 8) c.fillRect(0, y, w, 3);
    cadre(c, w, h, "#d4b483", 6);
    ecrire(c, "ZIK", w / 2, 50, 44, "#e7d3a1", 700);
  },
};

// Tailles des textures et du panneau 3D (largeur l donnée par l'élément, hauteur = ratio * l).
export const FORMATS = {
  affiche: [256, 368, 1.42],
  "disque-or": [256, 320, 1.25],
  partie: [1024, 480, 0.47],
  neon: [512, 160, 0.31],
  logo: [1024, 380, 0.37],
  onair: [320, 128, 0.4],
  tableau: [512, 320, 0.62],
  postit: [512, 256, 0.4],
  maquettes: [512, 220, 0.37],
  partition: [256, 320, 1.25],
  cassettes: [512, 256, 0.5],
};
