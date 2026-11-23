// Relance d'un écran du salon qui a planté (fiche 2026-11-23-salon-erreur-relance)
export const DELAIS = [3, 10, 30];
export const PAUSE_SEC = 60;
export const RESET_MS = 2 * 60 * 1000;
export const ECART_MIN_MS = 3000;
export const HEALTHZ_MS = 4000;
export const RESEAU_MS = 5000;
export const REMONTAGE_MS = 5000;
export const SANS_NAVIGATION_MS = 60000;
export const REPLI_MS = 30000;

export function screenOf(pathname) {
  const m = /^\/salon\/(host|regie|play)\/?$/.exec(String(pathname ?? ""));
  return m ? m[1] : null;
}

export function delaiDe(essai) {
  return DELAIS[essai - 1] ?? PAUSE_SEC;
}

// saved : { essai, at } lu du stockage (at = dernière relance), ou null
export function nextAttempt(saved, now) {
  const recent =
    saved &&
    Number.isInteger(saved.essai) &&
    saved.essai > 0 &&
    now - saved.at >= 0 &&
    now - saved.at < RESET_MS;
  const essai = recent ? saved.essai + 1 : 1;
  return { essai, delai: delaiDe(essai) };
}

// ZIK répond : le rechargement ne tombera pas sur la page d'erreur du navigateur
export async function zikAnswers(fetchFn, timers = globalThis) {
  const ctrl = new AbortController();
  let t;
  const abandon = new Promise((resolve) => {
    t = timers.setTimeout(() => {
      ctrl.abort();
      resolve(null);
    }, HEALTHZ_MS);
  });
  try {
    const r = await Promise.race([
      fetchFn("/healthz", { cache: "no-store", signal: ctrl.signal }),
      abandon,
    ]);
    return !!r && r.status < 500;
  } catch {
    return false;
  } finally {
    timers.clearTimeout(t);
  }
}

export function refDe(code, now) {
  const d = new Date(now);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${code || "—"} · ${hh}:${mm}`;
}

// L'écran de relance a lui-même planté : rechargement toutes les 30 s, sans
// autre dépendance que le navigateur
export function creerSecours(relance, deps = {}) {
  const timers = deps.timers ?? globalThis;
  const essaie = (fn) => {
    try {
      fn();
    } catch {
      /* rien de plus à tenter */
    }
  };
  let repli = null;
  return {
    declencher() {
      essaie(() => relance.destroy());
      essaie(() => {
        repli ??= timers.setInterval(
          () =>
            essaie(() => {
              const nav = deps.nav ?? navigator;
              if (nav.onLine !== false) (deps.location ?? location).reload();
            }),
          REPLI_MS,
        );
      });
    },
    arreter() {
      essaie(() => timers.clearInterval(repli));
      essaie(() => relance.destroy());
      repli = null;
    },
  };
}
