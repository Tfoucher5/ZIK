// Temps d'incident, calculé comme Statuspage et GitHub : seules les minutes en
// incident comptent, « perturbé » (lent, service qui répond) vaut 0. Un jour se
// colore selon la durée de ses incidents, pas selon son pire moment : jaune,
// orange à partir de 20 min, rouge à partir d'une heure ou dès qu'une sonde
// bloquante (site, base, temps réel : plus personne ne joue) est tombée.

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const ORANGE_FROM_MIN = 20;
const RED_FROM_MIN = 60;
export const BLOCKING = ["site", "db", "realtime"];

const paris = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

// Écart entre l'heure de Paris et l'heure UTC à l'instant t
function offset(t) {
  const p = Object.fromEntries(
    paris.formatToParts(new Date(t)).map((x) => [x.type, x.value]),
  );
  return Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute) - t;
}

/** Minuit à Paris d'un jour AAAA-MM-JJ, en ms. */
export function parisMidnight(day) {
  const utc = Date.parse(`${day}T00:00:00Z`);
  return utc - offset(utc - offset(utc));
}

/** Intervalles [début, fin) où au moins une des sondes est en incident. */
export function incidentSpans(transitions, probes, now) {
  const rows = (transitions ?? [])
    .filter((r) => probes.includes(r.probe))
    .map((r) => ({ ...r, t: Date.parse(r.checked_at) }))
    .sort((a, b) => a.t - b.t);
  const open = {};
  const spans = [];
  for (const r of rows) {
    if (r.level === "incident") open[r.probe] ??= r.t;
    else if (open[r.probe] !== undefined) {
      spans.push([open[r.probe], r.t]);
      delete open[r.probe];
    }
  }
  for (const start of Object.values(open)) spans.push([start, now]);
  spans.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [s, e] of spans) {
    const last = merged.at(-1);
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  return merged;
}

const overlap = (spans, from, to) =>
  spans.reduce(
    (n, [s, e]) => n + Math.max(0, Math.min(e, to) - Math.max(s, from)),
    0,
  );

/** Minutes d'incident de chaque jour (heure de Paris). */
export function downtimeByDay(spans, days) {
  return days.map((d) => {
    const from = parisMidnight(d);
    // Lendemain : midi + 24 h tombe toujours le jour suivant, même à 23 ou 25 h
    const next = new Date(from + DAY + 12 * 60 * MINUTE)
      .toISOString()
      .slice(0, 10);
    // Arrondi vers le haut : quelques secondes d'incident ne laissent pas le jour vert
    return Math.ceil(overlap(spans, from, parisMidnight(next)) / MINUTE);
  });
}

/**
 * Couleur d'un jour : null sans mesure, « ok » sans incident, puis « minor »
 * (jaune), « major » (orange) ou « incident » (rouge).
 */
export function dayLevel(minutes, blockingMinutes, measured) {
  if (!measured) return null;
  if (minutes === 0) return "ok";
  if (blockingMinutes > 0 || minutes >= RED_FROM_MIN) return "incident";
  return minutes >= ORANGE_FROM_MIN ? "major" : "minor";
}

/**
 * Part du temps hors incident depuis la première mesure, en %. Arrondi vers le
 * bas : un incident ne s'affiche jamais 100 %.
 */
export function availabilityFrom(spans, since, now) {
  if (since == null || now <= since) return null;
  const down = overlap(spans, since, now);
  return Math.floor(((now - since - down) / (now - since)) * 1000) / 10;
}

/** Première mesure des sondes dans la période (la sonde y apparaît en transition). */
export function firstSeen(transitions, probes, from) {
  const times = (transitions ?? [])
    .filter((r) => probes.includes(r.probe))
    .map((r) => Date.parse(r.checked_at));
  return times.length ? Math.max(from, Math.min(...times)) : null;
}
