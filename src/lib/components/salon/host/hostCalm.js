export const IDLE_MS = 5000;

export const isLive = (phase) => phase === "round" || phase === "summary";

// Phases où les réglages de la TV se cachent au repos : lobby, manches, fin de partie
export const calmable = (phase) =>
  phase === "lobby" || phase === "gameover" || isLive(phase);

// Réglages de la TV cachés après un temps sans geste, sauf quand l'hôte en a
// besoin (pause, reprise, panne, aide ou choix de playlist ouverts)
export function barCalm(h, idle) {
  const keepOpen =
    h.helpOpen ||
    h.pickerOpen ||
    h.paused ||
    h.restarting ||
    !!h.restored ||
    !!h.videoOutage;
  return calmable(h.phase) && idle && !keepOpen;
}
