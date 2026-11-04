import { getAdminClient } from "../../config.js";
import { healthState } from "./monitor.js";
import { worst } from "./levels.js";
import { LABELS } from "./probes.js";

// Données des pages /statut (public, par grand service) et /admin/statut
// (détail par sonde). Historique : 30 jours, comme la purge d'ops.health_checks.

export const HISTORY_DAYS = 30;
const CACHE_MS = 60 * 1000;
const MAX_INCIDENTS = 10;

// Ce que voit le public : pas de jargon, un service = des sondes. Les messages
// d'erreur, les salons ouverts et l'état interne du serveur (mémoire, réactivité,
// capacité de la base) restent à l'admin.
export const GROUPS = [
  {
    id: "site",
    label: "Site et comptes",
    probes: ["site", "db", "auth"],
  },
  {
    id: "salons",
    label: "Soirées (salons)",
    probes: ["realtime", "media", "snapshots"],
  },
  {
    id: "musique",
    label: "Musique",
    probes: ["youtube", "deezer", "spotify"],
  },
  { id: "paiements", label: "Paiements", probes: ["stripe"] },
  { id: "mails", label: "Mails", probes: ["mail"] },
];

// Sondes dont la valeur est un temps de réponse, seule mesure rendue publique
const TIMED = [
  "site",
  "auth",
  "realtime",
  "youtube",
  "deezer",
  "spotify",
  "mail",
];

// Noms de la page publique, sans jargon. L'admin garde les noms techniques.
const PUBLIC_LABELS = {
  realtime: "Connexion des écrans et des téléphones",
  spotify: "Import de playlists Spotify",
  deezer: "Extraits audio Deezer",
  stripe: "Paiements en ligne",
  mail: "Envoi des mails",
};
const publicLabel = (id) => PUBLIC_LABELS[id] ?? LABELS[id] ?? id;
const adminLabel = (id) => LABELS[id] ?? id;

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

/**
 * Part des mesures hors incident, en %. Arrondi vers le bas : un incident ne
 * s'affiche jamais 100 %. Plusieurs sondes : la moins disponible fait foi, les
 * pannes de deux sondes pouvant se recouvrir.
 */
export function availabilityOf(rows, probes) {
  let lowest = null;
  for (const probe of probes) {
    const own = (rows ?? []).filter((r) => r.probe === probe);
    const total = own.reduce((n, r) => n + Number(r.checks), 0);
    if (!total) continue;
    const down = own
      .filter((r) => r.level === "incident")
      .reduce((n, r) => n + Number(r.checks), 0);
    const pct = Math.floor(((total - down) / total) * 1000) / 10;
    lowest = lowest === null ? pct : Math.min(lowest, pct);
  }
  return lowest;
}

/** Incidents à partir des changements de niveau, du plus récent au plus ancien. */
export function incidentsFrom(rows, probes, label = adminLabel) {
  const open = {};
  const out = [];
  const byTime = [...(rows ?? [])].sort(
    (a, b) => Date.parse(a.checked_at) - Date.parse(b.checked_at),
  );
  for (const r of byTime) {
    if (!probes.includes(r.probe)) continue;
    if (r.level === "incident") {
      open[r.probe] ??= {
        probe: r.probe,
        label: label(r.probe),
        startedAt: r.checked_at,
        endedAt: null,
      };
      if (!out.includes(open[r.probe])) out.push(open[r.probe]);
    } else if (open[r.probe]) {
      open[r.probe].endedAt = r.checked_at;
      delete open[r.probe];
    }
  }
  return out
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .slice(0, MAX_INCIDENTS);
}

async function read(fn, args) {
  try {
    const { data, error } = await getAdminClient().rpc(fn, args);
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.warn(`[statut] ${fn} :`, e?.message ?? e);
    return null;
  }
}

const loadAll = () =>
  Promise.all(
    ["health_history", "health_availability", "health_transitions"].map((fn) =>
      read(fn, { p_days: HISTORY_DAYS }),
    ),
  );

const PUBLIC_PROBES = GROUPS.flatMap((g) => g.probes);

/**
 * Pastille du pied de page, présente sur les pages de vente : seul un vrai
 * incident s'y affiche, pas un délai dépassé une fois chez un service externe.
 * Sans « media » : une seule salle gratuite suffit à le faire basculer.
 * null tant qu'aucune sonde n'est passée.
 */
export function publicLevel() {
  const { probes } = healthState();
  if (!Object.keys(probes).length) return null;
  return PUBLIC_PROBES.some(
    (p) => p !== "media" && probes[p]?.level === "incident",
  )
    ? "incident"
    : "ok";
}

let cache = null;

export async function publicStatus(now = Date.now()) {
  if (cache && now - cache.at < CACHE_MS) return cache.value;
  const state = healthState();
  const days = lastDays(HISTORY_DAYS, now);
  const [rows, counts, transitions] = await loadAll();
  const history = historyBy(rows, GROUPS, days);
  const measured = Object.values(state.probes).map((p) => p.at);
  const value = {
    // Le serveur vient de démarrer : aucune sonde n'est encore passée
    checked: measured.length > 0,
    checkedAt: measured.length ? Math.max(...measured) : null,
    days,
    historyAvailable: rows !== null,
    availability: availabilityOf(counts, PUBLIC_PROBES),
    incidents:
      transitions === null
        ? null
        : incidentsFrom(transitions, PUBLIC_PROBES, publicLabel),
    groups: GROUPS.map((g) => ({
      id: g.id,
      label: g.label,
      level: worst(g.probes.map((p) => state.probes[p]?.level ?? "ok")),
      availability: availabilityOf(counts, g.probes),
      history: history[g.id],
      probes: g.probes.map((id) => ({
        id,
        label: publicLabel(id),
        level: state.probes[id]?.level ?? null,
        ms: TIMED.includes(id) ? (state.probes[id]?.value ?? null) : null,
      })),
    })),
  };
  // Sans mesure, pas de cache : la page montrerait « Vérification en cours » une
  // minute de plus après la première sonde
  if (value.checked) cache = { at: now, value };
  return value;
}

export async function adminStatus(now = Date.now()) {
  const state = healthState();
  const days = lastDays(HISTORY_DAYS, now);
  const ids = Object.keys(LABELS);
  const [rows, counts, transitions] = await loadAll();
  const history = historyBy(
    rows,
    ids.map((id) => ({ id, probes: [id] })),
    days,
  );
  return {
    level: state.level,
    days,
    historyAvailable: rows !== null,
    uptime: Math.round(process.uptime()),
    version: process.env.npm_package_version ?? null,
    incidents: transitions === null ? null : incidentsFrom(transitions, ids),
    probes: ids.map((id) => ({
      id,
      label: LABELS[id],
      ...(state.probes[id] ?? { level: null }),
      availability: availabilityOf(counts, [id]),
      history: history[id],
    })),
  };
}

export function resetStatusCache() {
  cache = null;
}
