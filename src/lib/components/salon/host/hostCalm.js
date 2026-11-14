export const IDLE_MS = 5000;

export const isLive = (phase) => phase === "round" || phase === "summary";

// Réglages de la TV cachés : en manche, après un temps sans geste, sauf quand
// l'hôte en a besoin (pause, reprise, panne, aide ou choix de playlist ouverts)
export function barCalm(h, idle) {
  const keepOpen =
    h.helpOpen ||
    h.pickerOpen ||
    h.paused ||
    h.restarting ||
    !!h.restored ||
    !!h.videoOutage;
  return isLive(h.phase) && idle && !keepOpen;
}
