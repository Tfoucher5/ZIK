/** Où en est le salon, en une ligne. */
export function phaseLabel(s) {
  if (s.phase === "lobby") return "En attente des joueurs";
  if (s.phase === "starting") return "Lancement de la partie";
  if (s.phase === "gameover") return "Partie finie";
  return `Manche ${s.round}/${s.maxRounds}${s.phase === "summary" ? " · réponse affichée" : ""}${s.paused ? " · en pause" : ""}`;
}
