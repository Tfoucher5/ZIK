import { grade } from "./levels.js";

// Outils communs aux sondes : mesure d'un appel et sonde HTTP simple
export const TIMEOUT_MS = 5000;

export async function timed(fn) {
  const t = Date.now();
  try {
    const value = await fn();
    return { ms: Date.now() - t, value };
  } catch (e) {
    return { ms: Date.now() - t, error: e?.message ?? String(e) };
  }
}

export const signal = () => AbortSignal.timeout(TIMEOUT_MS);

// Réponse lente (> 2 s) = seuil approché ; erreur ou délai dépassé = échec
export async function httpProbe(
  url,
  fetchFn,
  { check, headers, accept = (res) => res.ok } = {},
) {
  const r = await timed(async () => {
    const res = await fetchFn(url, { signal: signal(), headers });
    if (!accept(res)) throw new Error(`HTTP ${res.status}`);
    if (check) return check(await res.json());
    // Corps non lu : on libère la connexion sans attendre le ramasse-miettes
    await res.body?.cancel();
  });
  if (r.error) return { result: "fail", value: r.ms, detail: r.error };
  // check rend un texte : service là mais freiné, seuil approché
  if (r.value) return { result: "warn", value: r.ms, detail: r.value };
  return { result: grade(r.ms, 2000, Infinity), value: r.ms };
}
