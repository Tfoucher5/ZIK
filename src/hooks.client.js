import { noteCrash } from "$lib/components/salon/relance/journal.js";
import { screenOf } from "$lib/components/salon/relance/relance.js";

// Garde l'exception brute d'un écran du salon pour le journal de l'écran de
// relance. Ne renvoie rien : SvelteKit garde son erreur par défaut.
export function handleError(input) {
  try {
    if (screenOf(input.event?.url?.pathname)) noteCrash(input.error);
  } catch {
    /* ne jamais lever ici */
  }
}
