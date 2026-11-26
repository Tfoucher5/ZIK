// Manches restantes après un changement de playlist en pleine partie, comme le
// serveur les tire : le choix de l'organisateur moins la manche en cours, sans
// dépasser les titres de la nouvelle sélection (doublons entre playlists
// comptés : borne haute).
export function roundsAfterSwap({ maxRounds, round, playlists, selectedIds }) {
  const counts = new Map(playlists.map((p) => [p.id, p.trackCount ?? 0]));
  const tracks = selectedIds.reduce((n, id) => n + (counts.get(id) ?? 0), 0);
  return Math.max(0, Math.min((maxRounds ?? 0) - (round ?? 0), tracks));
}
