// Crée les cartes de tous les titres du catalogue pas encore vérifiés.
// Usage : node scripts/cards-backfill.mjs [--retry-missing]
// --retry-missing : retraite aussi les titres déjà vérifiés restés sans carte.
// Reprend là où il s'est arrêté : un titre traité n'est plus resélectionné.
import { enrichPending } from "../src/lib/server/services/cards.js";

const startedAt = Date.now();
let last = 0;

const result = await enrichPending({
  retryMissing: process.argv.includes("--retry-missing"),
  onProgress({ done, found, total }) {
    if (done - last < 50 && done !== total) return;
    last = done;
    const min = ((Date.now() - startedAt) / 60_000).toFixed(1);
    console.log(`${done}/${total} titres, ${found} cartes (${min} min)`);
  },
});

console.log(
  `Terminé : ${result.done} titres traités, ${result.found} rattachés à une carte.`,
);
process.exit(0);
