const val = (p) => (typeof p.n === "number" ? p.n : (p.y ?? 0));

export function sumWindow(series, n, offset = 0) {
  const end = Math.max(0, series.length - offset);
  return series
    .slice(Math.max(0, end - n), end)
    .reduce((s, p) => s + val(p), 0);
}

export function computeDelta(current, previous) {
  const dir = current > previous ? "up" : current < previous ? "down" : "flat";
  if (previous === 0) return { pct: current === 0 ? 0 : null, dir };
  return { pct: Math.round(((current - previous) / previous) * 100), dir };
}

export const pct = (n, of) => (of ? Math.round((n / of) * 1000) / 10 : 0);

export function ago(iso, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "hier" : `il y a ${d} j`;
}

export const euros = (cents) =>
  (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
