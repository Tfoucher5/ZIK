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

// Sous ce seuil, un pourcentage de rétention n'est qu'un artefact de petit
// échantillon — on l'affiche mais grisé.
export const MIN_SAMPLE = 20;

export function isSignificant(n) {
  return n >= MIN_SAMPLE;
}

export function cohortCell(retained, total) {
  if (total === 0) return null;
  return {
    pct: toPercent(retained, total),
    retained,
    total,
    significant: isSignificant(total),
  };
}

export function leverRow(row) {
  const withPct = toPercent(row.with_retained, row.with_n);
  const withoutPct = toPercent(row.without_retained, row.without_n);
  return {
    lever: row.lever,
    withPct,
    withoutPct,
    deltaPts: withPct - withoutPct,
    withN: row.with_n,
    withoutN: row.without_n,
    significant: isSignificant(row.with_n) && isSignificant(row.without_n),
  };
}

export function stickiness(dau, mau) {
  return toPercent(dau, mau);
}
