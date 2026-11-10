// Les appels serveur à l'API Deezer passent ici (hors sonde, une par minute) :
// son quota (50 requêtes par 5 s) est compté par IP, donc partagé par tout le
// serveur. Les appels d'une partie ou d'une recherche partent sans attendre.
// Les appels de fond (import, collage de liste, cartes, pochettes) s'arrêtent
// à BULK_CAP pour leur laisser la place, et attendent après un refus de quota.

const WINDOW_MS = 5_000;
const BULK_CAP = 35;
const HEADERS = { "User-Agent": "ZIK-BlindTest/1.0" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Sur globalThis : server.js et le bundle SvelteKit chargent chacun ce module
const quota = (globalThis.__zik_deezerQuota ??= { sent: [], pausedUntil: 0 });

function used(now) {
  const { sent } = quota;
  while (sent.length && sent[0] <= now - WINDOW_MS) sent.shift();
  return sent.length;
}

async function slot(bulk) {
  for (;;) {
    const now = Date.now();
    if (!bulk || (now >= quota.pausedUntil && used(now) < BULK_CAP)) {
      used(now);
      quota.sent.push(now);
      return;
    }
    const oldest = quota.sent[0] ?? now;
    await sleep(
      Math.max(quota.pausedUntil - now, oldest + WINDOW_MS - now, 0) + 10,
    );
  }
}

// Corps JSON de Deezer, avec son champ `error` s'il refuse. Lève une erreur
// sur un échec réseau ou HTTP. Code 4 = quota dépassé : le fond se met en
// pause, puis nouvel essai, rapide pour une partie ou une recherche.
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
    if (data?.error?.code !== 4) return data;
    quota.pausedUntil = Date.now() + WINDOW_MS;
    if (i === tries - 1) return data;
    await sleep(bulk ? WINDOW_MS : 1_000);
  }
}

export function resetDeezerQuota() {
  quota.sent.length = 0;
  quota.pausedUntil = 0;
}
