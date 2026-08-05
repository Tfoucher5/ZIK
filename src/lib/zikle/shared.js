export const SNIPPET_DURATIONS = [1, 2, 4, 7, 11, 16];
export const MAX_ATTEMPTS = SNIPPET_DURATIONS.length;

export function durationForAttempt(attemptIndex) {
  const i = Math.min(Math.max(attemptIndex, 0), SNIPPET_DURATIONS.length - 1);
  return SNIPPET_DURATIONS[i];
}

export function todayParis(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(
    date,
  );
}

function addDaysStr(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function computeStreak(results, today = todayParis()) {
  const won = new Set(results.filter((r) => r.won).map((r) => r.date));
  let cursor = won.has(today) ? today : addDaysStr(today, -1);
  let streak = 0;
  while (won.has(cursor)) {
    streak++;
    cursor = addDaysStr(cursor, -1);
  }
  return streak;
}

// Grille emoji : un carré par essai possible. Les essais non joués restent
// neutres, pour qu'on lise d'un coup d'œil la rapidité sans révéler le titre.
export function buildShareSquares(guesses, correctTrackId, won) {
  return Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
    if (i >= guesses.length) return "⬛";
    if (won && i === guesses.length - 1) return "🟩";
    return guesses[i] === correctTrackId ? "🟩" : "🟥";
  }).join("");
}

export function buildShareGrid(
  dayNumber,
  guesses,
  correctTrackId,
  won,
  { streak = 0 } = {},
) {
  const squares = buildShareSquares(guesses, correctTrackId, won);
  const result = won
    ? `${guesses.length}/${MAX_ATTEMPTS}`
    : `X/${MAX_ATTEMPTS}`;
  // Secondes d'extrait qu'il a fallu écouter : c'est la mécanique du jeu,
  // et c'est plus parlant que le seul nombre d'essais.
  const seconds = won
    ? durationForAttempt(guesses.length - 1)
    : SNIPPET_DURATIONS[MAX_ATTEMPTS - 1];
  const lines = [
    `Zikle #${dayNumber} · ${result}`,
    squares,
    won ? `Trouvé en ${seconds}s d'extrait` : `Pas trouvé en ${seconds}s`,
  ];
  if (streak > 1) lines.push(`Série de ${streak} jours`);
  lines.push("", "https://www.zik-music.fr/zikle");
  return lines.join("\n");
}

// Forme d'onde déterministe dérivée de la date : le même jour donne toujours le
// même dessin pour tous les joueurs, sans analyser l'audio (cross-origin).
// Partagée entre le jeu et la liste des archives.
export function waveformForDate(dateStr, count = 72) {
  let seed = 0;
  for (const c of dateStr) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, (_, i) => {
    const env = Math.sin((i / count) * Math.PI) * 0.5 + 0.5;
    const beat = i % 8 === 0 ? 0.3 : 0;
    return Math.min(1, 0.18 + (rand() * 0.62 + beat) * env);
  });
}

export function escapeIlike(q) {
  return q.replace(/[%_]/g, (c) => `\\${c}`);
}

export function dedupById(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}
