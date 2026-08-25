export const BUG_MOTIFS = [
  { value: "audio", label: "Je n'entends pas la musique" },
  { value: "mauvaise-reponse", label: "Un titre a une mauvaise réponse" },
  { value: "affichage", label: "Problème d'affichage" },
  { value: "autre", label: "Autre" },
];

// La manche en cours est proposée sans son titre : l'afficher donnerait la réponse.
export function buildTrackChoices({ history = [], current = null }) {
  const choices = [];
  if (current?.round) {
    choices.push({
      key: `cur-${current.round}`,
      round: current.round,
      label: `Manche ${current.round} — en cours`,
      locked: true,
      trackId: current.trackId ?? null,
      videoId: current.videoId ?? null,
      answer: null,
    });
  }
  for (const h of history) {
    choices.push({
      key: `h-${h.round}-${h.trackId ?? "x"}`,
      round: h.round,
      label: `M${h.round} · ${h.answer}`,
      locked: false,
      trackId: h.trackId ?? null,
      videoId: h.videoId ?? null,
      answer: h.answer ?? null,
    });
  }
  return choices;
}

export function sanitizeReportTracks(value) {
  if (!Array.isArray(value) || value.length > 50) return null;
  return value.map((t) => ({
    trackId: t?.trackId ?? null,
    videoId: t?.videoId ?? null,
    round: typeof t?.round === "number" ? t.round : null,
    answer: typeof t?.answer === "string" ? t.answer : null,
  }));
}
