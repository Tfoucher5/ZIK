// La journée d'un agent au repos, d'après l'heure réelle, sans dépendance à three.js.
import { NIVEAUX, lieux } from "../tour/plan.js";

const graine = (s) => {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
};

// Pièces de chaque moment de la journée, choisies dans le plan.
export const LIEUX = {
  cafe: ["blue-note", "cavern-club", "duc-des-lombards", "mezzanine"],
  dejeuner: ["motown", "stax"],
  pause: ["madison-square-garden", "studio-54", "eurovision"],
  balade: ["strawberry-fields", "hyde-park", "octopus", "cafe-del-mar"],
  soiree: ["le-palace", "studio-54", "eurovision"],
};
// Théo vit au penthouse.
const CHEZ_THEO = {
  cafe: ["bains-douches"],
  dejeuner: ["bains-douches"],
  pause: ["rough-trade", "hall-of-fame"],
  balade: ["stairway"],
  soiree: ["bains-douches", "stairway"],
};

// Créneau de l'agent à l'heure h (décimale) : maison, poste, cafe, dejeuner, pause, balade ou soiree.
// Arrivée entre 8 h et 9 h, déjeuner d'une heure entre 12 h et 14 h, départ entre 18 h et 20 h ;
// un sur six reste le soir jusqu'à 23 h. Nora tient l'accueil de 8 h à 20 h, Théo ne quitte pas la tour.
export function creneau(h, id) {
  const g = graine(id);
  if (id === "accueil") return h >= 8 && h < 20 ? "poste" : "maison";
  const arrivee = 8 + (g % 5) * 0.25;
  const depart = 18 + (g % 9) * 0.25;
  const veille = g % 6 === 0;
  if (id !== "theo" && (h < arrivee || h >= (veille ? 23 : depart)))
    return "maison";
  if (id === "theo" && (h < 8 || h >= 20)) return "soiree";
  const midi = 12 + (g % 4) * 0.25;
  if (h >= midi && h < midi + 1) return "dejeuner";
  if (h >= depart) return "soiree";
  if (h < arrivee + 0.5) return "cafe";
  const r = graine(`${id}:${Math.floor(h * 4)}`) % 12;
  return ["cafe", "pause", "balade"][r] ?? "poste";
}

export const ou = (piece) => {
  for (const n of NIVEAUX)
    if (lieux(n).some((p) => p.id === piece)) return { niveau: n.id, piece };
  return null;
};

// Lieu d'un créneau : { niveau, piece }, ou null pour le poste et la maison.
export function lieu(c, id, h) {
  const liste = (id === "theo" ? CHEZ_THEO : LIEUX)[c];
  if (!liste) return null;
  return ou(liste[graine(`${id}:${Math.floor(h)}`) % liste.length]);
}

// Salle de réunion d'un pôle : réservée au pôle, marquée réunion dans le plan. Le board siège à Woodstock.
export function salleDe(pole) {
  if (pole === "board") return ou("woodstock");
  for (const n of NIVEAUX)
    for (const p of lieux(n))
      if (p.reunion && p.acces === `pole:${pole}`) return ou(p.id);
  return null;
}
