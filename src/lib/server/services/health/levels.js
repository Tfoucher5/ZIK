// Niveau d'une sonde à partir de ses dernières mesures (audit, phase 2) :
// - suspicion : un seuil approché deux fois de suite, ou un premier échec ;
// - incident : trois échecs de suite.
// Une mesure saine remet tout à zéro.

import { LEVELS, worst } from "../../../shared/health/levels.js";

export { LEVELS, worst };

/**
 * @param {{ warns: number, fails: number }} streak séries en cours
 * @param {"ok" | "warn" | "fail"} result mesure du jour
 */
export function nextStreak(streak, result) {
  if (result === "ok") return { warns: 0, fails: 0 };
  if (result === "warn") return { warns: streak.warns + 1, fails: 0 };
  return { warns: 0, fails: streak.fails + 1 };
}

export function levelOf(streak) {
  if (streak.fails >= 3) return "incident";
  if (streak.fails >= 1 || streak.warns >= 2) return "suspect";
  return "ok";
}

/** Seuils « plus c'est grand, pire c'est » : ok, warn (approché) ou fail. */
export function grade(value, warnAt, failAt) {
  if (value >= failAt) return "fail";
  if (value >= warnAt) return "warn";
  return "ok";
}
