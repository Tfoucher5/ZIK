import { getAdminClient } from "../../config.js";
import { healthState } from "./monitor.js";
import { worst } from "./levels.js";
import { LABELS } from "./probes.js";

// Données des pages /statut (public, par grand service) et /admin/statut
// (détail par sonde). Historique : 30 jours, comme la purge d'ops.health_checks.

export const HISTORY_DAYS = 30;
const CACHE_MS = 60 * 1000;

// Ce que voit le public : pas de jargon, un service = des sondes. Les
// paiements arriveront avec leur sonde (dernier webhook Stripe).
export const GROUPS = [
  {
    id: "site",
    label: "Site et comptes",
    probes: ["db", "eventLoop", "memory", "errors"],
  },
  { id: "salons", label: "Soirées (salons)", probes: ["media"] },
  {
    id: "musique",
    label: "Musique (YouTube et Deezer)",
    probes: ["youtube", "deezer"],
  },
];

/** Jours (AAAA-MM-JJ, heure de Paris) du plus ancien au plus récent. */
// On recule par jours de calendrier, pas par pas de 24 h : au changement
// d'heure, un jour fait 23 ou 25 h et la frise sauterait ou doublerait un jour
export function lastDays(n, now = Date.now()) {
  const paris = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" });
  const [y, m, d] = paris.format(new Date(now)).split("-").map(Number);
  const utc = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" });
  return Array.from({ length: n }, (_, i) =>
    utc.format(new Date(Date.UTC(y, m - 1, d - (n - 1 - i)))),
  );
}

/**
 * Pire niveau par jour pour chaque groupe (ou chaque sonde si byProbe).
 * Un jour sans mesure vaut null : la page l'affiche comme « pas de données ».
 */
export function historyBy(rows, keys, days) {
  const out = Object.fromEntries(keys.map((k) => [k.id, days.map(() => null)]));
  const index = new Map(days.map((d, i) => [d, i]));
  for (const r of rows ?? []) {
    const i = index.get(String(r.day).slice(0, 10));
    if (i === undefined) continue;
    for (const k of keys) {
      if (!k.probes.includes(r.probe)) continue;
      const cur = out[k.id][i];
      out[k.id][i] = cur ? worst([cur, r.level]) : r.level;
    }
  }
  return out;
}

async function loadHistory() {
  try {
    const { data, error } = await getAdminClient().rpc("health_history", {
      p_days: HISTORY_DAYS,
    });
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.warn("[statut] historique :", e?.message ?? e);
    return null;
  }
}

let cache = null;

export async function publicStatus(now = Date.now()) {
  if (cache && now - cache.at < CACHE_MS) return cache.value;
  const state = healthState();
  const days = lastDays(HISTORY_DAYS, now);
  const rows = await loadHistory();
  const history = historyBy(rows, GROUPS, days);
  const value = {
    // Le serveur vient de démarrer : aucune sonde n'est encore passée
    checked: Object.keys(state.probes).length > 0,
    days,
    historyAvailable: rows !== null,
    groups: GROUPS.map((g) => ({
      id: g.id,
      label: g.label,
      level: worst(g.probes.map((p) => state.probes[p]?.level ?? "ok")),
      history: history[g.id],
    })),
  };
  cache = { at: now, value };
  return value;
}

export async function adminStatus(now = Date.now()) {
  const state = healthState();
  const days = lastDays(HISTORY_DAYS, now);
  const probes = Object.keys(LABELS).map((id) => ({ id, probes: [id] }));
  const rows = await loadHistory();
  const history = historyBy(rows, probes, days);
  return {
    level: state.level,
    days,
    historyAvailable: rows !== null,
    probes: Object.keys(LABELS).map((id) => ({
      id,
      label: LABELS[id],
      ...(state.probes[id] ?? { level: null }),
      history: history[id],
    })),
  };
}

export function resetStatusCache() {
  cache = null;
}
