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

export function buildShareGrid(dayNumber, guesses, correctTrackId, won) {
  const squares = guesses
    .map((g) => (g === correctTrackId ? "🟩" : "🟥"))
    .join("");
  const result = won
    ? `${guesses.length}/${MAX_ATTEMPTS}`
    : `X/${MAX_ATTEMPTS}`;
  return `Zikle #${dayNumber} 🎧 ${result}\n\n${squares}\n\nhttps://www.zik-music.fr/zikle`;
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
