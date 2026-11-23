// Constructeurs des données du plan : polygones et mobilier typé, en mètres.
export const rect = (x1, y1, x2, y2) => [
  [x1, y1],
  [x2, y1],
  [x2, y2],
  [x1, y2],
];

// Mur : porteur, cloison, vitrage, vitrage-or, pointille (trait tireté), mobile (cloison amovible), trou, garde-corps.
export const mur = (type, x1, y1, x2, y2) => ({ type, x1, y1, x2, y2 });

// Porte : charnière en (x, y), passage de largeur l le long de axe ("h" ou "v"), battant du côté sens (1 ou -1).
// double : deux vantaux ; inverse : charnière au bout du passage ; type : battant, passage, tambour, quai, portiques.
export const porte = (x, y, l, axe, sens, entre, plus = {}) => ({
  x,
  y,
  l,
  axe,
  sens,
  entre,
  ...plus,
});

const m = (type, x, y, w, h, plus) => ({ type, x, y, w, h, ...plus });
export const objet = (type, x, y, w, h, r = 0) => m(type, x, y, w, h, { r });
export const table = (x, y, w, h) => m("table", x, y, w, h);
export const canape = (x, y, w, h) => m("canape", x, y, w, h);
export const zone = (type, x, y, w, h) => m(type, x, y, w, h, { zone: 1 });
export const escalier = (x, y, w, h) => m("escalier", x, y, w, h);
export const ronde = (x, y, r, n = 0) => ({ type: "ronde", x, y, r, n });
export const arbre = (x, y, r) => ({ type: "arbre", x, y, r });
export const chaise = (x, y) => ({ type: "chaise", x, y });
export const disque = (x, y, r) => ({ type: "disque", x, y, r });
export const ligne = (type, x1, y1, x2, y2) => ({ type, x1, y1, x2, y2 });
export const ecran = (x1, y1, x2, y2) => ligne("ecran", x1, y1, x2, y2);
// Îlot de n postes face à face ; occupants : rangée nord puis rangée sud (id d'agent, "renfort:Prénom", "libre" ou null).
export const ilot = (x, y, n, occupants = []) => ({
  type: "ilot",
  x,
  y,
  n,
  occupants,
});
// Bureau : a = 0 le titulaire au nord, 180 au sud.
export const poste = (x, y, w, occupant = null, a = 0, h = 0.9) => ({
  type: "poste",
  x,
  y,
  w,
  h,
  a,
  occupant,
});
export const banque = (x, y, w, h, occupant = null) =>
  m("banque", x, y, w, h, { occupant, r: 0.3 });
export const comptoir = (x, y, w, h, n, occupant = null) =>
  m("comptoir", x, y, w, h, { n, occupant });
export const trace = (type, d) => ({ type, d });
