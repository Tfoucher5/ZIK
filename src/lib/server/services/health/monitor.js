import { getAdminClient } from "../../config.js";
import { errorLog, healthProbes } from "../../state.js";
import { alertAdminsSafe } from "../admin/alerts.js";
import { sendMail, ADMIN_EMAIL } from "../../mail/send.js";
import { LEVELS, levelOf, pushResult, worst } from "./levels.js";
import { LABELS, makeProbes } from "./probes.js";
import { collectErrors } from "./errorJournal.js";

// Surveillance maison : sondes toutes les 60 s, historique dans
// ops.health_checks (à chaque changement d'état et toutes les 5 min), erreurs
// regroupées dans ops.errors, alertes push et mail aux admins.

const EVERY_MS = 60 * 1000;
const SNAPSHOT_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const state = healthProbes;
let lastSnapshot = 0;
let lastFlush = Date.now();
const lastDbWarn = {};

// Une base en panne ne doit pas noyer le journal : un avertissement par
// quart d'heure et par écriture
async function rpc(fn, args) {
  try {
    const { error } = await getAdminClient().rpc(fn, args);
    if (error) throw error;
  } catch (e) {
    if (Date.now() - (lastDbWarn[fn] ?? 0) < 15 * 60 * 1000) return;
    lastDbWarn[fn] = Date.now();
    console.warn(`[surveillance] ${fn} :`, e?.message ?? e);
  }
}

const recordHealth = (rows) => rpc("record_health", { p_rows: rows });

// Hors prod (staging), les alertes le disent : un incident du staging ne doit
// pas ressembler à une panne de prod. Les mails, eux, ne partent pas hors prod
// (pas de clé Resend).
const ENV = process.env.RAILWAY_ENVIRONMENT_NAME ?? "";
const PREFIX = ENV && !/prod/i.test(ENV) ? "[DEV] " : "";
// Une sonde qui oscille ne doit pas noyer les admins
const PUSH_THROTTLE_MS = 10 * 60 * 1000;
const MAIL_THROTTLE_MS = 30 * 60 * 1000;
const lastMail = {};

/** Prévient les admins quand une sonde s'aggrave, et quand un incident se termine. */
export function alertChange({ name, from, to, detail }) {
  const label = LABELS[name] ?? name;
  const pire = LEVELS.indexOf(to) > LEVELS.indexOf(from);
  if (!pire && from !== "incident") return;
  const title =
    PREFIX +
    (!pire
      ? `Rétabli : ${label}`
      : to === "incident"
        ? `Incident : ${label}`
        : `À surveiller : ${label}`);
  alertAdminsSafe(
    "admin_errors",
    {
      title,
      body: detail ?? "Voir la page de statut.",
      url: "/admin/statut",
      tag: `health:${name}:${to}`,
    },
    { throttleMs: PUSH_THROTTLE_MS },
  );
  // Mail : un incident au plus par demi-heure et par sonde ; son rétablissement
  // part seulement si l'incident a été envoyé
  const now = Date.now();
  if (to === "incident") {
    if (now - (lastMail[name]?.at ?? -Infinity) < MAIL_THROTTLE_MS) return;
    lastMail[name] = { at: now, open: true };
  } else if (from === "incident" && lastMail[name]?.open) {
    lastMail[name].open = false;
  } else return;
  sendMail({
    to: ADMIN_EMAIL,
    subject: `[ZIK] ${title}`,
    text: `${title}\n\n${detail ?? ""}\n\nhttps://www.zik-music.fr/admin/statut`,
  }).catch(() => {});
}

/** Un passage de toutes les sondes. Rend les changements de niveau. */
export async function runChecks({
  probes,
  record = recordHealth,
  alert = alertChange,
  now = Date.now(),
} = {}) {
  const results = await Promise.all(
    Object.entries(probes).map(async ([name, probe]) => [
      name,
      await probe().catch((e) => ({ result: "fail", detail: e?.message })),
    ]),
  );
  const snapshot = now - lastSnapshot >= SNAPSHOT_MS;
  if (snapshot) lastSnapshot = now;
  const rows = [];
  const changes = [];
  for (const [name, r] of results) {
    const prev = state[name] ?? { recent: [], level: "ok" };
    const recent = pushResult(prev.recent ?? [], r.result);
    const level = levelOf(recent, prev.level);
    const detail = r.detail ? String(r.detail).slice(0, 500) : null;
    state[name] = { recent, level, value: r.value ?? null, detail, at: now };
    if (level !== prev.level)
      changes.push({ name, from: prev.level, to: level, detail });
    if (level !== prev.level || snapshot)
      rows.push({ probe: name, level, value: r.value ?? null, detail });
  }
  if (rows.length) await record(rows);
  for (const c of changes) alert(c);
  return changes;
}

/** État courant, pour /healthz et les pages de statut. */
export function healthState() {
  const probes = Object.fromEntries(
    Object.entries(state).map(([name, s]) => [
      name,
      { level: s.level, value: s.value, detail: s.detail, at: s.at },
    ]),
  );
  return {
    level: worst(Object.values(state).map((s) => s.level)),
    probes,
  };
}

export async function flushErrors(log = errorLog, now = Date.now()) {
  const rows = collectErrors(log, lastFlush);
  lastFlush = now;
  if (rows.length) await rpc("record_errors", { p_rows: rows });
  return rows.length;
}

// Remise à zéro entre deux tests
export function resetHealth() {
  for (const k of Object.keys(state)) delete state[k];
  for (const k of Object.keys(lastMail)) delete lastMail[k];
  lastSnapshot = 0;
  lastFlush = Date.now();
}

export function startHealthMonitor() {
  const probes = makeProbes();
  const tick = () => {
    runChecks({ probes }).catch((e) =>
      console.warn("[surveillance]", e?.message ?? e),
    );
    flushErrors();
  };
  // Premier passage une fois le serveur démarré
  setTimeout(tick, 10_000).unref?.();
  setInterval(tick, EVERY_MS).unref?.();
  rpc("purge_ops", {});
  setInterval(() => rpc("purge_ops", {}), DAY_MS).unref?.();
}

/**
 * /healthz : réponse courte pour Railway et le chien de garde GitHub. 503
 * seulement si la base est en incident : une panne d'un service externe
 * (YouTube, Deezer) n'empêche pas le site de servir.
 */
export function healthz(res) {
  const { level, probes } = healthState();
  res.writeHead(probes.db?.level === "incident" ? 503 : 200, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(
    JSON.stringify({ status: level, uptime: Math.round(process.uptime()) }),
  );
}
