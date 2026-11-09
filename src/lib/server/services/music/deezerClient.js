// Tous les appels serveur à l'API Deezer passent ici : son quota (50 requêtes
// par 5 s) est compté par IP, donc partagé par tout le serveur.
// Les appels d'une partie ou d'une recherche partent toujours sans attendre.
// Les appels de fond (import, collage de liste, cartes, pochettes) s'arrêtent
// à BULK_CAP pour leur laisser la place, et attendent après un refus de quota.

const WINDOW_MS = 5_000;
const BULK_CAP = 35;
const HEADERS = { "User-Agent": "ZIK-BlindTest/1.0" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sent = [];
let bulkPausedUntil = 0;

function used(now) {
  while (sent.length && sent[0] <= now - WINDOW_MS) sent.shift();
  return sent.length;
}

async function slot(bulk) {
  for (;;) {
    const now = Date.now();
    if (!bulk || (now >= bulkPausedUntil && used(now) < BULK_CAP)) {
      used(now);
      sent.push(now);
      return;
    }
    await sleep(
      Math.max(bulkPausedUntil - now, sent[0] + WINDOW_MS - now, 0) + 10,
    );
  }
}

// Corps JSON de Deezer, avec son champ `error` s'il refuse. Lève une erreur
// sur un échec réseau ou HTTP. Code 4 = quota dépassé : nouvel essai, rapide
// pour une partie ou une recherche, après la fenêtre pour le fond.
export async function deezerFetch(
  path,
  { bulk = false, timeout = 8_000 } = {},
) {
  const tries = bulk ? 4 : 2;
  for (let i = 0; ; i++) {
    await slot(bulk);
    const res = await fetch(`https://api.deezer.com${path}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) throw new Error(`Deezer HTTP ${res.status}`);
    const data = await res.json();
    if (data?.error?.code !== 4 || i === tries - 1) return data;
    bulkPausedUntil = Date.now() + WINDOW_MS;
    await sleep(bulk ? WINDOW_MS : 1_000);
  }
}

export function resetDeezerQuota() {
  sent.length = 0;
  bulkPausedUntil = 0;
}
