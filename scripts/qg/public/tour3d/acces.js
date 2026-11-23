// Qui passe où dans la tour, et par quel ascenseur, sans dépendance à three.js.
import { Grille, dedans } from "../chemins.js";
import { ACCES, NOYAU, TRAME, lieux } from "../tour/plan.js";
import { versLocal } from "./repere.js";

export const POLES = ["tech", "operations", "argent", "produit", "marketing"];
const DIRECTION = ["ceo", "avocat", "client-pro", ...POLES];
export const VISITEUR = new Set(["public"]);

// Tout le monde : employes (et le café public) ; son pôle ; la direction pour les chefs, Claire, Victor, Gérard ; Théo partout.
export function droits(id, pole) {
  if (id === "theo") return new Set(ACCES);
  const d = new Set(["public", "employes"]);
  if (POLES.includes(id)) d.add(`pole:${id}`);
  if (pole) d.add(`pole:${pole}`);
  if (DIRECTION.includes(id)) d.add("direction");
  return d;
}

const HORS = { rue: "public", E2: "employes", service: "service" };
export const accesDe = (niveau, id) =>
  HORS[id] ?? lieux(niveau).find((p) => p.id === id)?.acces ?? "service";

// Une porte ne s'ouvre que si l'agent a le droit d'être des deux côtés.
export const passe = (niveau, porte, d) =>
  porte.entre.every((e) => d.has(accesDe(niveau, e)));

const local = ([x, y]) => {
  const p = versLocal(x, y);
  return [p.x, p.z];
};
const COIN = versLocal(0, 0);
const FIN = versLocal(TRAME.largeur, TRAME.profondeur);
const RUE = 3;

// Pièce de chaque case, calculée une fois par niveau (-1 : noyau, dehors, vide).
const cartes = new Map();
function carte(niveau) {
  if (cartes.has(niveau.id)) return cartes.get(niveau.id);
  const g = new Grille(COIN.x - RUE, FIN.x + RUE, COIN.z - RUE, FIN.z + RUE);
  const pieces = lieux(niveau);
  const polys = pieces.map((p) => p.poly.map(local));
  const idx = new Int16Array(g.l * g.h).fill(-1);
  for (let j = 0; j < g.h; j++)
    for (let i = 0; i < g.l; i++) {
      const { x, z } = g.centre(i, j);
      const dehors = x < COIN.x || x > FIN.x || z < COIN.z || z > FIN.z;
      idx[j * g.l + i] = dehors
        ? niveau.id === "n0"
          ? -2
          : -1
        : polys.findIndex((p) => dedans(p, x, z));
    }
  const c = { idx, acces: pieces.map((p) => p.acces) };
  cartes.set(niveau.id, c);
  return c;
}

function ouvrir(g, p) {
  const e = 0.15;
  const [a, b] =
    p.axe === "h"
      ? [versLocal(p.x + e, p.y - 0.5), versLocal(p.x + p.l - e, p.y + 0.5)]
      : [versLocal(p.x - 0.5, p.y + e), versLocal(p.x + 0.5, p.y + p.l - e)];
  const [i0, j0] = g.case(a.x, a.z);
  const [i1, j1] = g.case(b.x, b.z);
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++)
      if (g.dans(i, j)) g.bloc[j * g.l + i] = g.mur[j * g.l + i] = 0;
}

// Grille de chemins d'un niveau pour un jeu de droits : pièces permises, murs pleins, portes permises ouvertes.
// Au RDC, la rue autour de la tour est praticable par qui a le droit public.
export function grille(niveau, d) {
  const { idx, acces } = carte(niveau);
  const g = new Grille(COIN.x - RUE, FIN.x + RUE, COIN.z - RUE, FIN.z + RUE);
  for (let k = 0; k < idx.length; k++) {
    const n = idx[k];
    const ok = n === -2 ? d.has("public") : n >= 0 && d.has(acces[n]);
    g.bloc[k] = ok ? 0 : 1;
  }
  const { largeur: L, profondeur: P } = TRAME;
  const murs = [
    ...niveau.murs.filter((m) => m.type !== "pointille" && m.type !== "trou"),
    ...[
      [0, 0, L, 0],
      [L, 0, L, P],
      [L, P, 0, P],
      [0, P, 0, 0],
    ].map(([x1, y1, x2, y2]) => ({ x1, y1, x2, y2 })),
  ];
  for (const m of murs) {
    const [x0, z0] = local([m.x1, m.y1]);
    const [x1, z1] = local([m.x2, m.y2]);
    g.segment(x0, z0, x1, z1, 0.15);
  }
  for (const p of niveau.portes) if (passe(niveau, p, d)) ouvrir(g, p);
  return g;
}

// Palier devant chaque ascenseur (hors monte-charge) qui s'arrête au niveau, en coordonnées locales.
export function paliers(niveauId) {
  const r = {};
  for (const a of NOYAU.ascenseurs) {
    if (a.id === "MC" || !a.dessert.includes(niveauId)) continue;
    const p = a.porte;
    const o = p.cote * 0.9;
    const [x, y] =
      p.axe === "v" ? [p.x + o, p.y + p.l / 2] : [p.x + p.l / 2, p.y + o];
    r[a.id] = versLocal(x, y);
  }
  return r;
}

// Trajet en ascenseur de `de` à `vers` : A1/A2 pour tous, AP pour la direction et Théo, une correspondance au besoin.
export function itineraire(d, de, vers, occupes = new Set()) {
  if (de === vers) return [];
  const prive = d.has("direction") || d.has("fondateur");
  const cabines = NOYAU.ascenseurs.filter(
    (a) => a.id !== "MC" && (!a.prive || prive),
  );
  const direct = (x, y) => {
    const c = cabines.filter(
      (a) => a.dessert.includes(x) && a.dessert.includes(y),
    );
    return c.find((a) => a.prive) ?? c.find((a) => !occupes.has(a.id)) ?? c[0];
  };
  const a = direct(de, vers);
  if (a) return [{ asc: a.id, de, vers }];
  for (const t of ["n6", "n0"]) {
    const x = direct(de, t);
    const y = direct(t, vers);
    if (x && y)
      return [
        { asc: x.id, de, vers: t },
        { asc: y.id, de: t, vers },
      ];
  }
  return null;
}
