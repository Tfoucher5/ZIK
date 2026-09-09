/**
 * Playlists selectionnables pour un salon : celles de l'utilisateur, plus les
 * officielles et les publiques. Partagee entre l'ecran de configuration et
 * l'ecran hote, qui proposent la meme liste.
 */
export async function loadSalonPlaylists(sb, userId) {
  const [{ data: mine }, { data: shared }] = await Promise.all([
    sb
      .from("custom_playlists")
      .select("id, name, emoji, track_count")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false }),
    sb
      .from("custom_playlists")
      .select("id, name, emoji, track_count, is_official")
      .or("is_public.eq.true,is_official.eq.true")
      .neq("owner_id", userId)
      .order("name"),
  ]);

  const flat = [];
  for (const p of mine ?? []) {
    flat.push({
      id: p.id,
      name: p.name,
      emoji: p.emoji || "🎵",
      trackCount: p.track_count,
      group: "Mes playlists",
    });
  }
  for (const p of shared ?? []) {
    if (flat.some((f) => f.id === p.id)) continue;
    flat.push({
      id: p.id,
      name: p.name,
      emoji: p.emoji || "🎵",
      trackCount: p.track_count,
      group: p.is_official ? "Officielles" : "Publiques",
    });
  }
  return flat;
}
