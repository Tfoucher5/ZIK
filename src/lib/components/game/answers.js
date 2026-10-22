// Cases de réponse de la page de jeu : vides au début de la manche,
// remplies avec la réponse complète à la fin.

export const emptySlots = () => ({
  artist: { val: "???", state: null },
  title: { val: "???", state: null },
  feats: [],
  extras: [],
});

export const emptyQcm = () => ({
  choices: [],
  chosen: null,
  reveal: null,
  result: null,
  answered: 0,
  total: 0,
});

// Artiste principal, sans ses featurings : « A feat. B », « A, B », « A & B » → « A »
export function mainArtist(artist) {
  const m = artist.match(
    /^(.+?)(?:\s*\((?:feat\.?|ft\.?|featuring)\s+[^)]+\)|\s+(?:feat\.?|ft\.?|featuring)\s+.+)$/i,
  );
  if (m) return m[1].trim();
  const ci = artist.indexOf(", ");
  if (ci > 0) return artist.slice(0, ci).trim();
  const am = artist.match(/^(.+?)\s+&\s+.+$/);
  return am ? am[1].trim() : artist;
}

// Réponse complète de fin de manche, découpée en cases
export function answerSlots(d) {
  const dash = d.answer.indexOf(" - ");
  const fullArtist = dash > -1 ? d.answer.slice(0, dash) : d.answer;
  const title = dash > -1 ? d.answer.slice(dash + 3) : "—";
  const feats = d.featArtists || [];
  return {
    artist: {
      val: feats.length ? mainArtist(fullArtist) : fullArtist,
      state: d.foundArtist ? "found" : "missed",
    },
    title: { val: title || "—", state: d.foundTitle ? "found" : "missed" },
    feats: feats.map((fa, i) => ({
      val: fa,
      state: (d.foundFeats || [])[i] ? "found" : "missed",
    })),
    extras: (d.extraAnswers || []).map((e, i) => ({
      label: e.label,
      val: e.value,
      state: (d.foundExtras || [])[i] ? "found" : "missed",
    })),
  };
}
