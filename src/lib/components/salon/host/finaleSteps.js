// Séquence du podium de la soirée sur la TV : le 3e, le 2e, le tambour, puis le
// vainqueur en plein écran au même instant que le téléphone donne la place
// (FINALE_WINNER_MS), son repli dans la colonne et les places suivantes.
import { FINALE_WINNER_MS } from "../../../data/salonOptions.js";

// État affiché : step = colonnes montées (1 le 3e, 2 le 2e, 3 le vainqueur),
// drum = suspense, flood = aplat plein écran (« in », « fold », null), rest = 4e et suivants
export const FINALE_START = { step: 0, drum: false, flood: null, rest: false };
export const FINALE_END = { step: 3, drum: false, flood: null, rest: true };

export function finaleSteps({ count = 3, sound = true, reduced = false } = {}) {
  if (reduced) return [{ at: 0, set: FINALE_END }];
  return [
    count >= 3 && { at: 1500, set: { step: 1 } },
    count >= 2 && { at: 3600, set: { step: 2 } },
    { at: 5700, set: { drum: true }, ...(sound && { drumroll: true }) },
    { at: FINALE_WINNER_MS, set: { flood: "in" }, confetti: true },
    { at: FINALE_WINNER_MS + 600, set: { drum: false } },
    { at: FINALE_WINNER_MS + 2500, set: { step: 3, flood: "fold" } },
    { at: FINALE_WINNER_MS + 3200, set: { rest: true } },
    { at: FINALE_WINNER_MS + 3400, set: { flood: null } },
  ].filter(Boolean);
}
