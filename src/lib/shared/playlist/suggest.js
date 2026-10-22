// Classe les titres des radios Deezer des artistes de la playlist.
// Un titre proposé par plusieurs radios colle à l'ensemble de la playlist,
// pas à un seul artiste. La popularité (rank Deezer) départage : un titre
// connu se devine mieux en blind test. 2 titres max par artiste.
export function rankSuggestions(radios, exclude = [], max = 60) {
  const skip = new Set(exclude.map(String));
  const byId = new Map();
  for (const radio of radios)
    for (const t of radio) {
      if (skip.has(t.external_id)) continue;
      const hit = byId.get(t.external_id);
      if (hit) hit.votes++;
      else byId.set(t.external_id, { t, votes: 1 });
    }
  const sorted = [...byId.values()].sort(
    (a, b) => b.votes - a.votes || (b.t.rank || 0) - (a.t.rank || 0),
  );
  const perArtist = new Map();
  const out = [];
  for (const { t } of sorted) {
    const n = perArtist.get(t.artist) || 0;
    if (n >= 2) continue;
    perArtist.set(t.artist, n + 1);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

// Graines envoyées au serveur : un titre Deezer par artiste, les artistes
// les plus présents dans la playlist d'abord.
export function pickSeeds(tracks, max = 8) {
  const groups = new Map();
  for (const t of tracks) {
    if (t.source !== "deezer" || !/^\d+$/.test(t.external_id ?? "")) continue;
    const g = groups.get(t.artist);
    if (g) g.n++;
    else groups.set(t.artist, { id: t.external_id, n: 1 });
  }
  return [...groups.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, max)
    .map((g) => g.id);
}
