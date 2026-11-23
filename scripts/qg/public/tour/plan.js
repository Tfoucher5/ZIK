// ZIK TOWER : le plan est la source de vérité du QG. Mètres, origine au coin nord-ouest, x vers l'est, y vers le sud.
// La page /plans.html et la 3D se construisent à partir de ces données.
import ss from "./niveaux/ss.js";
import n0 from "./niveaux/n0.js";
import n1 from "./niveaux/n1.js";
import n2 from "./niveaux/n2.js";
import n3 from "./niveaux/n3.js";
import n4 from "./niveaux/n4.js";
import n5 from "./niveaux/n5.js";
import n6 from "./niveaux/n6.js";
import n7 from "./niveaux/n7.js";
import toit from "./niveaux/toit.js";

// Du sous-sol au toit. z : sol fini ; h : d'étage à étage (sous plafond = h - 0,80) ; x0 : bord ouest de l'emprise.
export const NIVEAUX = [ss, n0, n1, n2, n3, n4, n5, n6, n7, toit];

export const TRAME = {
  largeur: 43.2,
  profondeur: 25.2,
  x: [0, 7.2, 14.4, 21.6, 28.8, 36, 43.2],
  y: [0, 7.2, 18, 25.2],
  axesX: ["1", "2", "3", "4", "5", "6", "7"],
  axesY: ["A", "B", "C", "D"],
  poteau: 0.6,
};

const jusqua = (de, a) =>
  NIVEAUX.slice(
    NIVEAUX.findIndex((n) => n.id === de),
    NIVEAUX.findIndex((n) => n.id === a) + 1,
  ).map((n) => n.id);

// Noyau unique entre les axes 5 et 6, au même endroit sur toute la hauteur.
// porte : palier côté cote (-1 ouest ou nord, 1 est ou sud).
export const NOYAU = {
  rect: [28.8, 7.2, 36, 18],
  niveaux: jusqua("ss", "toit"),
  murs: [
    [28.8, 10.4, 36, 10.4],
    [28.8, 14.6, 36, 14.6],
    [33.6, 7.2, 33.6, 10.4],
    [31.2, 10.4, 31.2, 14.6],
    [32.2, 10.4, 32.2, 14.6],
    [28.8, 12.5, 31.2, 12.5],
    [33.4, 14.6, 33.4, 18],
  ],
  ascenseurs: [
    {
      id: "A1",
      nom: "Ascenseur public A1",
      cabine: [28.8, 10.4, 2.4, 2.1],
      porte: { x: 28.8, y: 10.9, l: 1.1, axe: "v", cote: -1 },
      dessert: jusqua("ss", "n6"),
      etiquette: [30, 11.6],
    },
    {
      id: "A2",
      nom: "Ascenseur public A2",
      cabine: [28.8, 12.5, 2.4, 2.1],
      porte: { x: 28.8, y: 13, l: 1.1, axe: "v", cote: -1 },
      dessert: jusqua("ss", "n6"),
      etiquette: [30, 13.7],
    },
    {
      id: "MC",
      nom: "Monte-charge",
      cabine: [33.6, 7.2, 2.4, 3.2],
      porte: { x: 36, y: 8.2, l: 1.2, axe: "v", cote: 1 },
      dessert: jusqua("ss", "n6"),
      etiquette: [34.8, 9],
    },
    {
      id: "AP",
      nom: "Ascenseur privé",
      prive: true,
      cabine: [33.4, 14.6, 2.6, 3.4],
      porte: { x: 34.1, y: 18, l: 1.2, axe: "h", cote: 1 },
      dessert: ["n0", "n6", "n7", "toit"],
      etiquette: [34.7, 16.5],
    },
  ],
  escaliers: [
    {
      id: "E1",
      volees: [
        [29.1, 7.5, 4.2, 1.25],
        [29.1, 8.85, 4.2, 1.25],
      ],
      porte: { x: 28.8, y: 8.3, l: 0.9, axe: "v", sens: -1 },
      dessert: jusqua("ss", "toit"),
      etiquette: [31.2, 7.05],
    },
  ],
  gaines: [[31.2, 10.4, 1, 4.2]],
  sanitaires: {
    cuvettes: [
      [32.6, 10.8],
      [33.5, 10.8],
      [34.4, 10.8],
      [35.2, 10.8],
      [29.3, 15],
      [30.2, 15],
    ],
    portes: [{ x: 30.5, y: 18, l: 0.9, axe: "h", sens: 1 }],
    passage: [32.5, 14.6, 33.3, 14.6],
    etiquettes: [
      [34.2, 13],
      [31, 16.9],
    ],
  },
};

// Second escalier, en pignon ouest. Au N5 il sort en édicule sur la terrasse.
export const E2 = {
  id: "E2",
  rect: [0, 0, 3.3, 6.6],
  dessert: jusqua("n0", "n5"),
  edicules: { n5: [0.3, 0.3, 3.3, 6.6] },
};

// Vides et éléments sur plusieurs niveaux. type : vide (rien au sol), atrium (vide planté vu d'en haut), verriere, eau.
export const VIDES = [
  {
    id: "vide-hall",
    type: "vide",
    niveau: "n1",
    nom: "Vide sur hall",
    rect: [0, 7.2, 14.4, 18],
  },
  {
    id: "atrium-n4",
    type: "atrium",
    niveau: "n4",
    nom: "Vide sur l'atrium",
    sous: ["cimes des arbres", "coursives nord et sud"],
    rect: [7.2, 7.2, 21.6, 18],
    cimes: "strawberry-fields",
  },
  {
    id: "atrium-n5",
    type: "vide",
    niveau: "n5",
    nom: "Atrium",
    sous: ["vide · façade vitrée ouest"],
    rect: [7.2, 7.2, 14.4, 18],
  },
  {
    id: "verriere",
    type: "verriere",
    niveau: "n6",
    sous: ["verrière de l'atrium"],
    rect: [8.4, 8.2, 20.6, 17],
  },
  {
    id: "mur-eau",
    type: "eau",
    niveau: "n3",
    nom: "mur d'eau",
    rect: [7.2, 7.2, 8.45, 18],
    hauteur: 7.3,
  },
];

export const FESTIVALS = [
  "Woodstock",
  "Les Vieilles Charrues",
  "Hellfest",
  "Rock en Seine",
  "Solidays",
  "Les Eurockéennes",
  "Coachella",
  "Glastonbury",
  "Tomorrowland",
  "Primavera",
  "Montreux Jazz",
  "Fuji Rock",
  "Sziget",
  "Roskilde",
  "Lollapalooza",
];

// Qui peut entrer. pole:<id> renvoie à l'id du chef de pôle dans noms.js.
export const ACCES = [
  "public",
  "employes",
  "pole:tech",
  "pole:operations",
  "pole:argent",
  "pole:produit",
  "pole:marketing",
  "direction",
  "fondateur",
  "service",
];

export const niveau = (id) => NIVEAUX.find((n) => n.id === id);
export const lieux = (n) => [...n.pieces, ...n.terrasses];

// occupants : agents assis à un poste du mobilier de la pièce (renforts et places libres exclus).
for (const n of NIVEAUX)
  for (const p of lieux(n))
    p.occupants = p.mobilier
      .flatMap((m) => [m.occupant, ...(m.occupants ?? [])])
      .filter((id) => id && id !== "libre" && !id.startsWith("renfort:"));
