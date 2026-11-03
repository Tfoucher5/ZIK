import { createHash } from "node:crypto";

// Journal d'erreurs durable : les erreurs en mémoire (errorLog) sont
// regroupées par empreinte (message sans les nombres ni les identifiants),
// avec un compteur, puis envoyées à ops.errors.

export function fingerprintOf(level, msg) {
  const forme = String(msg)
    .split("\n")[0]
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, "#")
    .replace(/\b[0-9a-f]{16,}\b/gi, "#")
    .replace(/\d+/g, "#")
    .slice(0, 300);
  return createHash("sha1").update(`${level}|${forme}`).digest("hex");
}

/** Regroupe les entrées plus récentes que since en lignes pour ops.errors. */
export function collectErrors(log, since) {
  const rows = new Map();
  for (const e of log) {
    if (e.ts <= since || (e.level !== "error" && e.level !== "warn")) continue;
    const fp = fingerprintOf(e.level, e.msg);
    const at = new Date(e.ts).toISOString();
    const row = rows.get(fp);
    if (!row) {
      rows.set(fp, {
        fingerprint: fp,
        level: e.level,
        message: String(e.msg).slice(0, 2000),
        count: 1,
        first_seen: at,
        last_seen: at,
      });
      continue;
    }
    row.count++;
    if (at < row.first_seen) row.first_seen = at;
    if (at > row.last_seen) row.last_seen = at;
  }
  return [...rows.values()];
}
