// Déco de la ZIK TOWER, du RDC au N6 (le N7 a la sienne). Données pures du plan, en mètres comme plan.js.
// Objet mural : (x, y) sur la face du mur, face = vers où il regarde (n, s, e, o), h = hauteur de son centre.
// Objet posé (sol) : (x, y) = son centre, dans un angle. l = largeur le long du mur (sinon TAILLE).
export const MURAL = {
  logo: { l: 3.6, h: 1.9 },
  affiche: { l: 0.7, h: 1.6 },
  "disque-or": { l: 0.5, h: 1.7 },
  partie: { l: 3.6, h: 1.85 },
  neon: { l: 2, h: 2.2 },
  vinyles: { l: 2.8, h: 1.75 },
  guitare: { l: 0.4, h: 1.5 },
  basse: { l: 0.4, h: 1.5 },
  casque: { l: 0.25, h: 1.6 },
  onair: { l: 1, h: 2.25 },
  tableau: { l: 2.4, h: 1.7 },
  postit: { l: 3, h: 1.5 },
  maquettes: { l: 3, h: 1.5 },
  partition: { l: 0.5, h: 1.65 },
  cassettes: { l: 1.6, h: 1.6 },
};
export const SOL = {
  jukebox: { l: 0.9 },
  ampli: { l: 0.8 },
  enceinte: { l: 0.5 },
  micro: { l: 0.4 },
  platine: { l: 0.8 },
  trophee: { l: 0.45 },
  plante: { l: 0.5 },
  tapis: { l: 3 },
};
export const FACES = { n: [0, -1], s: [0, 1], e: [1, 0], o: [-1, 0] };

const d = (piece, type, x, y, face, plus = {}) => ({
  piece,
  type,
  x,
  y,
  face,
  ...plus,
});
const sol = (piece, type, x, y, face, plus = {}) =>
  d(piece, type, x, y, face, { sol: true, ...plus });

export const DECO = {
  n0: [
    d("carnegie-hall", "logo", 5.8, 7.2, "s"),
    d("carnegie-hall", "disque-or", 20.4, 7.2, "s"),
    sol("carnegie-hall", "tapis", 4.7, 15.8, "s", { l: 3.2, p: 2.2 }),
    d("olympia", "partie", 12, 7.2, "n"),
    d("olympia", "affiche", 7.4, 7.2, "n", { n: 0 }),
    d("olympia", "affiche", 15.6, 7.2, "n", { n: 1 }),
    d("olympia", "neon", 21.6, 3.4, "o", { t: "BLIND TEST", l: 2.4 }),
    sol("olympia", "enceinte", 3.75, 0.6, "e"),
    sol("olympia", "enceinte", 3.75, 6.65, "e"),
    sol("cavern-club", "jukebox", 0.5, 18.5, "e"),
    sol("cavern-club", "platine", 13.95, 24.75, "n"),
    d("cavern-club", "vinyles", 14.4, 23.2, "o"),
    d("cavern-club", "neon", 14.4, 20.4, "o", { t: "ENCORE !", l: 1.8 }),
    d("penny-lane", "affiche", 28.8, 16.6, "o", { n: 2 }),
    sol("penny-lane", "plante", 28.35, 17.5, "o"),
  ],
  n1: [
    d("mezzanine", "affiche", 28.8, 16.4, "o", { n: 3 }),
    d("stax", "vinyles", 36, 22.6, "o"),
    d("stax", "affiche", 33.2, 18, "s", { n: 4 }),
    d("stax", "disque-or", 34.6, 18, "s"),
  ],
  n2: [
    d("studio-54", "vinyles", 2.8, 7.2, "s"),
    d("studio-54", "neon", 11.8, 7.2, "s", { t: "ARCADE", h: 2.4 }),
    d("studio-54", "affiche", 5.2, 18, "n", { n: 0 }),
    d("studio-54", "affiche", 6.4, 18, "n", { n: 2 }),
    d("studio-54", "disque-or", 14.5, 18, "n"),
    d("studio-54", "disque-or", 18.5, 18, "n"),
    d("eurovision", "neon", 15.4, 9, "e", { t: "KARAOKÉ", l: 1.6 }),
    sol("eurovision", "micro", 21.2, 11.5, "o"),
    d("madison-square-garden", "neon", 8, 18, "s", { t: "128 BPM", l: 2.2 }),
    d("madison-square-garden", "affiche", 3, 18, "s", { n: 1 }),
    d("beale-street", "affiche", 28.8, 16.4, "o", { n: 3 }),
  ],
  n3: [
    d("hellfest", "tableau", 40.4, 18, "n"),
    d("blue-note", "affiche", 28.8, 16.2, "o", { n: 4 }),
    d("john-cage", "partition", 10.8, 21.8, "o"),
    d("john-cage", "partition", 10.8, 23, "o"),
    d("fillmore", "affiche", 16.2, 21.8, "e", { n: 0 }),
    d("fillmore", "guitare", 16.2, 23.2, "e"),
    d("abba", "disque-or", 38.6, 22.4, "o"),
    d("coachella", "affiche", 38.6, 22.4, "e", { n: 1 }),
  ],
  n4: [
    d("abbey-road", "onair", 40.5, 7.2, "n"),
    d("abbey-road", "casque", 36, 2, "e"),
    sol("abbey-road", "micro", 42.6, 0.6, "o"),
    d("capitol", "cassettes", 40.4, 18, "n"),
    d("the-factory", "postit", 16.12, 22.5, "e", { l: 3.6 }),
    d("the-factory", "maquettes", 16, 22.5, "o", { l: 3.6 }),
    d("sziget", "postit", 7.2, 12.6, "o"),
    d("duc-des-lombards", "affiche", 28.8, 16.2, "o", { n: 2 }),
    d("gainsbourg", "affiche", 32.4, 22.4, "e", { n: 3 }),
  ],
  n5: [
    d("le-palace", "affiche", 28.8, 16.2, "o", { n: 4 }),
    d("zenith", "affiche", 19.8, 18, "s", { n: 0 }),
    d("bobino", "guitare", 32.4, 3, "e"),
    d("bobino", "basse", 32.4, 4.2, "e"),
    sol("bobino", "ampli", 32.85, 0.45, "e"),
  ],
  n6: [
    sol("aretha", "trophee", 27.15, 0.45, "o"),
    d("aretha", "disque-or", 27.6, 3, "o"),
    sol("aretha", "tapis", 23.8, 3, "s", { l: 3, p: 2 }),
    d("salle-pleyel", "disque-or", 28.8, 15.8, "o"),
    sol("salle-pleyel", "tapis", 24, 16.6, "s", { l: 3.2, p: 2.6 }),
    d("balajo", "neon", 27.6, 22.4, "o", { t: "LIVE", l: 1.4 }),
    sol("balajo", "jukebox", 27.1, 24.65, "o"),
  ],
};

// Largeur et hauteur réelles d'un élément.
export const taille = (e) => {
  const t = (e.sol ? SOL : MURAL)[e.type];
  return { l: e.l ?? t.l, h: e.h ?? t.h };
};
