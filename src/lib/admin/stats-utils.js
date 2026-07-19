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

export function toPercent(part, total) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}
