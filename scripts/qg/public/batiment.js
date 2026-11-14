import { ZIK } from "./deco.js";

export const COULEURS = {
  ceo: ZIK.or,
  argent: "#F4E04D",
  operations: "#FF8C42",
  produit: "#8C7BFF",
  tech: "#5BC0EB",
  marketing: "#FF4F9A",
  board: ZIK.magenta,
  renforts: "#94A3B8",
};

// Contour du plateau : façade nord en biais, angles coupés à l'est, décroché au sud-ouest.
export const CONTOUR = [
  [-20, -8],
  [8, -10],
  [15, -10],
  [21, -4],
  [21, 6],
  [16, 10],
  [-8, 10],
  [-8, 6],
  [-20, 6],
];
export const LIMITES = [-21, 22, -11, 11];

// Murs extérieurs : baies vitrées au nord et à l'est, murs pleins à l'ouest.
// Côté caméra (sud), les murs sont coupés à hauteur d'appui comme sur une maquette.
export const FACADES = [
  [-20, -8, 8, -10, "fenetre"],
  [8, -10, 15, -10, "fenetre"],
  [15, -10, 21, -4, "fenetre"],
  [21, -4, 21, -3, "fenetre"],
  [21, -3, 21, 5.5, "plein"],
  [21, 5.5, 21, 6, "fenetre"],
  [21, 6, 16, 10, "fenetre", 1.2],
  [16, 10, 6, 10, "plein", 1.1],
  [6, 10, -2, 10, "fenetre", 1.2],
  [-2, 10, -8, 10, "plein", 1.1],
  [-8, 10, -8, 6, "plein"],
  [-8, 6, -20, 6, "fenetre", 1.2],
  [-20, 6, -20, -8, "plein"],
];

// Ligne des bureaux et salles fermés le long de la façade nord.
export const FRONT = -4.5;
export const facade = (x) =>
  x <= 8 ? -8 - (x + 20) / 14 : x <= 15 ? -10 : -10 + (x - 15);

// Contour d'une pièce adossée à la façade, de x0 à x1, fermée en z1 (angles de façade compris).
export const contreFacade = (x0, x1, z1 = FRONT) => [
  [x0, facade(x0)],
  ...[8, 15].filter((x) => x > x0 && x < x1).map((x) => [x, facade(x)]),
  [x1, facade(x1)],
  [x1, z1],
  [x0, z1],
];

// Salles de réunion : nom, x0, x1, z0 (null = façade), z1, mur de la télé.
export const SALLES = {
  tech: ["Le Larsen", -15, -9, null, FRONT, "ouest"],
  produit: ["La Démo", -9, -2, null, FRONT, "ouest"],
  marketing: ["Le Refrain", -8, -2, 6, 10, "ouest"],
  argent: ["La Grosse Caisse", 17, 21, -3, 1, "est"],
  operations: ["Le Tempo", 17, 21, 1, 5.5, "est"],
};
