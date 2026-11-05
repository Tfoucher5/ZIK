// Niveau d'une sonde à partir de ses 5 dernières mesures. Une lenteur ou un
// échec isolés ne disent rien ; un incident, c'est un service qui ne répond plus :
// - perturbé : 2 échecs sur 5, ou 3 mesures de suite lentes ou en échec ;
// - incident : 3 échecs sur 5 (une mesure saine au milieu ne l'efface pas) ;
//   la lenteur seule n'en fait jamais un ;
// - fin d'incident : 3 mesures de suite sans échec.

import { LEVELS, worst } from "../../../shared/health/levels.js";

export { LEVELS, worst };

const WINDOW = 5;

/** @param {("ok" | "warn" | "fail")[]} recent */
export const pushResult = (recent, result) =>
  [...recent, result].slice(-WINDOW);

export function levelOf(recent, prev = "ok") {
  const fails = recent.filter((r) => r === "fail").length;
  const last3 = recent.slice(-3);
  const full = last3.length === 3;
  if (prev === "incident" && !(full && !last3.includes("fail")))
    return "incident";
  if (fails >= 3) return "incident";
  if (fails >= 2 || (full && !last3.includes("ok"))) return "suspect";
  return "ok";
}

/** Seuils « plus c'est grand, pire c'est » : ok, warn (approché) ou fail. */
export function grade(value, warnAt, failAt) {
  if (value >= failAt) return "fail";
  if (value >= warnAt) return "warn";
  return "ok";
}
