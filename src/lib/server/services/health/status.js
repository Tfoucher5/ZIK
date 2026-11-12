import { getAdminClient } from "../../config.js";
import { healthState } from "./monitor.js";
import { worst } from "./levels.js";
import { LABELS } from "./probes.js";
import {
  BLOCKING,
  availabilityFrom,
  dayLevel,
  downtimeByDay,
  firstSeen,
  incidentSpans,
} from "./downtime.js";

// Données des pages /statut (public, par grand service) et /admin/statut
// (détail par sonde). Historique : 30 jours, comme la purge d'ops.health_checks.

export const HISTORY_DAYS = 30;
const CACHE_MS = 60 * 1000;
const MAX_INCIDENTS = 10;

// Ce que voit le public : pas de jargon, un service = des sondes. Les messages
// d'erreur, les salons ouverts et l'état interne du serveur (mémoire, réactivité,
// capacité de la base) restent à l'admin, comme l'import Spotify, réservé à ZIK
// par les restrictions de Spotify.
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
    probes: ["youtube", "deezer"],
  },
  { id: "paiements", label: "Paiements", probes: ["stripe"] },
  { id: "mails", label: "Mails", probes: ["mail"] },
];

// Sondes dont la valeur est un temps de réponse, seule mesure rendue publique
const TIMED = ["site", "auth", "realtime", "youtube", "deezer", "mail"];

// Noms de la page publique, sans jargon. L'admin garde les noms techniques.
const PUBLIC_LABELS = {
  realtime: "Connexion des écrans et des téléphones",
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
 * Frise et disponibilité d'un groupe de sondes, à partir de la durée réelle de
 * ses incidents (downtime.js). Sans transitions lisibles, la frise garde le
 * pire niveau du jour et la disponibilité reste inconnue.
 */
export function timeline(history, transitions, probes, days, now) {
  if (transitions === null)
    return { history, downtime: null, availability: null };
  const spans = incidentSpans(transitions, probes, now);
  const downtime = downtimeByDay(spans, days);
  const blocking = downtimeByDay(
    incidentSpans(
      transitions,
      probes.filter((p) => BLOCKING.includes(p)),
      now,
    ),
    days,
  );
  const from = now - HISTORY_DAYS * 24 * 60 * 60 * 1000;
  return {
    history: downtime.map((m, i) =>
      dayLevel(m, blocking[i], history[i] !== null),
    ),
    downtime,
    availability: availabilityFrom(
      spans,
      firstSeen(transitions, probes, from),
      now,
    ),
  };
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

const PAGE = 1000;

// Par pages : l'API coupe à son plafond de lignes, et des transitions qui
// manquent fausseraient la durée des incidents
async function read(fn, args) {
  try {
    const out = [];
    for (;;) {
      const { data, error } = await getAdminClient()
        .schema("ops")
        .rpc(fn, args)
        .range(out.length, out.length + PAGE - 1);
      if (error) throw error;
      out.push(...(data ?? []));
      if ((data ?? []).length < PAGE) return out;
    }
  } catch (e) {
    console.warn(`[statut] ${fn} :`, e?.message ?? e);
    return null;
  }
}

const loadAll = () =>
  Promise.all(
    ["health_history", "health_transitions"].map((fn) =>
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

// Disponibilité globale : temps où au moins un service public était en
// incident, sans « media » comme la pastille
function globalAvailability(transitions, now) {
  if (transitions === null) return null;
  const probes = PUBLIC_PROBES.filter((p) => p !== "media");
  const from = now - HISTORY_DAYS * 24 * 60 * 60 * 1000;
  return availabilityFrom(
    incidentSpans(transitions, probes, now),
    firstSeen(transitions, probes, from),
    now,
  );
}

let cache = null;

export async function publicStatus(now = Date.now()) {
  if (cache && now - cache.at < CACHE_MS) return cache.value;
  const state = healthState();
  const days = lastDays(HISTORY_DAYS, now);
  const [rows, transitions] = await loadAll();
  const history = historyBy(rows, GROUPS, days);
  const measured = Object.values(state.probes).map((p) => p.at);
  const value = {
    // Le serveur vient de démarrer : aucune sonde n'est encore passée
    checked: measured.length > 0,
    checkedAt: measured.length ? Math.max(...measured) : null,
    days,
    historyAvailable: rows !== null,
    availability: globalAvailability(transitions, now),
    incidents:
      transitions === null
        ? null
        : incidentsFrom(transitions, PUBLIC_PROBES, publicLabel),
    groups: GROUPS.map((g) => ({
      id: g.id,
      label: g.label,
      level: worst(g.probes.map((p) => state.probes[p]?.level ?? "ok")),
      ...timeline(history[g.id], transitions, g.probes, days, now),
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
  const [rows, transitions] = await loadAll();
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
      ...timeline(history[id], transitions, [id], days, now),
    })),
  };
}

export function resetStatusCache() {
  cache = null;
}
