// Contenu affiché sur la fiche publique d'une room.
// On n'expose jamais les titres des morceaux : ce sont les réponses du blind test.

// Les colonnes artist/title de custom_playlist_tracks sont l'ancien stockage et sont
// partiellement vides : la source réelle est le catalogue `tracks`, surchargé par
// custom_artist quand la room renomme un titre. Même règle que buildTrackFromRow.
export function artistFromRow(row) {
  return row?.custom_artist || row?.tracks?.artist || null;
}

export function topArtists(tracks, limit = 10) {
  const counts = new Map();
  for (const track of tracks ?? []) {
    const name = (track.artist ?? "").trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([artist, count]) => ({ artist, count }))
    .sort((a, b) => b.count - a.count || a.artist.localeCompare(b.artist, "fr"))
    .slice(0, limit);
}

const MODES = {
  classic: {
    label: "Mode Classique",
    intro: "Tu tapes le titre et l'artiste au clavier, le plus vite possible.",
    rules: [
      "Saisie libre : tu écris toi-même le titre et l'artiste",
      "L'orthographe est tolérée, les fautes proches sont acceptées",
      "Plus tu réponds vite, plus tu marques de points",
      "La partie compte pour ton classement ELO",
    ],
  },
  qcm: {
    label: "Mode QCM",
    intro: "Quatre propositions par extrait, tu choisis la bonne.",
    rules: [
      "Quatre réponses proposées à chaque manche",
      "Aucune saisie au clavier : un seul appui suffit",
      "Pas besoin de connaître l'orthographe exacte",
      "Format plus accessible, idéal pour jouer à plusieurs niveaux",
    ],
  },
};

export function modeRules(gameMode) {
  return MODES[gameMode] ?? MODES.classic;
}
