/**
 * Calculs purs de la page de profil.
 *
 * Extraits de ProfileView pour être testables sans monter de composant : ce
 * sont les seules parties de la page qui portent une vraie logique.
 */

/** Format court d'un score : 1 480 → « 1.5k ». */
export function fmtScore(n) {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return String(n);
}

/** « février 2026 » */
export function fmtSince(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

/** Date relative courte : « Auj. 15:21 », « Hier », « 1 oct. ». */
export function fmtDate(iso, maintenant = new Date()) {
  if (!iso) return "";
  const d = new Date(iso);
  const jours = Math.floor((maintenant - d) / 86400000);
  if (jours === 0)
    return `Auj. ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  if (jours === 1) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Pourcentage entier, 0 si le total est nul. */
export function pct(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

// ── Niveau et XP (mêmes formules que le serveur) ──
export const xpForLevel = (lvl) =>
  Math.round(50 * Math.pow(Math.max(0, lvl - 1), 2.5));
export const xpForNextLevel = (lvl) => Math.round(50 * Math.pow(lvl, 2.5));

/** Progression dans le niveau courant, bornée à 0-100. */
export function xpPercent(xp, lvl) {
  const bas = xpForLevel(lvl);
  const haut = xpForNextLevel(lvl);
  if (haut <= bas) return 0;
  return Math.max(
    0,
    Math.min(100, Math.round((((xp ?? 0) - bas) / (haut - bas)) * 100)),
  );
}

// ── Cadran ELO : plage 800 → 2200 ──
export const ELO_MIN = 800;
export const ELO_SPAN = 1400;
export const eloRatio = (elo) =>
  Math.max(0, Math.min(1, ((elo ?? 0) - ELO_MIN) / ELO_SPAN));

/**
 * Points de la courbe d'évolution, du plus ancien au plus récent.
 * Renvoie aussi min et max, qui servent de repères de lecture.
 */
export function buildCurve(games) {
  if (!games?.length)
    return { line: "", area: "", last: null, min: 0, max: 0, lastScore: null };
  const pts = [...games].reverse().map((g) => g.score);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const W = 640;
  const H = 130;
  const pad = 14;
  const coords = pts.map((s, i) => {
    const x = pts.length === 1 ? W / 2 : (i / (pts.length - 1)) * W;
    const y = pad + (1 - (s - min) / range) * (H - pad * 2);
    return [x, y];
  });
  const line = coords
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  return {
    line,
    area: `${line} ${W},${H} 0,${H}`,
    last: coords[coords.length - 1],
    min,
    max,
    lastScore: pts[pts.length - 1],
  };
}

/** Meilleurs scores par room officielle, les 5 premiers. */
export function buildItinerary(bestByRoom, roomInfo) {
  return Object.entries(bestByRoom ?? {})
    .map(([code, score]) => ({ room: roomInfo?.[code], score }))
    .filter((e) => e.room)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/** Rang ordinal français : 1 → « 1er », 42 → « 42e ». */
export function rangOrdinal(rank) {
  if (rank == null) return null;
  return rank === 1 ? "1er" : `${rank}e`;
}

/** Détail du rang : « sur 751 · top 8 % ». */
export function rangDetail(rank, totalPlayers, topPercent) {
  if (rank == null) return null;
  const bouts = [];
  if (totalPlayers) bouts.push(`sur ${totalPlayers.toLocaleString("fr-FR")}`);
  if (topPercent) bouts.push(`top ${topPercent} %`);
  return bouts.join(" · ") || "Classement";
}
