import { noteCrash } from "#lib/components/salon/relance/journal.js";
import { screenOf } from "#lib/components/salon/relance/relance.js";

// Garde l'exception brute d'un écran du salon pour le journal de l'écran de
// relance, et l'écrit en console comme le fait SvelteKit par défaut.
export function handleError(input) {
  try {
    console.error(input?.error);
    if (screenOf(input.event?.url?.pathname)) noteCrash(input.error);
  } catch {
    /* ne jamais lever ici */
  }
}
