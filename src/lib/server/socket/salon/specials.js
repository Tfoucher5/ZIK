import { SPECIALS } from "../../../data/salonOptions.js";
import { calcQcmPoints } from "../scoring.js";

const KINDS = Object.keys(SPECIALS);

// Manches spéciales (ZIK Pro) : une manche sur quatre environ, jamais la
// première ni deux à la suite (game.special est encore celle d'avant)
export function drawSpecial(salon) {
  const game = salon.game;
  if (!salon.pro || !salon.settings.specials) return null;
  if (game.currentRound < 2 || game.special) return null;
  return Math.random() < 0.25
    ? KINDS[Math.floor(Math.random() * KINDS.length)]
    : null;
}

export const roundMult = (game) => (game.special === "double" ? 2 : 1);

export function qcmPoints(salon, p) {
  const max = salon.game.timerMax ?? salon.settings.roundDuration;
  return calcQcmPoints(p._choiceTimeTaken ?? max, max) * roundMult(salon.game);
}
