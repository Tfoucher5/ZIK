/**
 * Playlists selectionnables pour un salon : celles de l'utilisateur, plus les
 * officielles et les publiques. Sans compte (userId null), seulement ces
 * dernieres. Partagee entre l'ecran de configuration et l'ecran hote, qui
 * proposent la meme liste. Ordre : officielles (les plus longues en tête), puis celles de l'utilisateur, puis les publiques.
 */
export async function loadSalonPlaylists(sb, userId) {
  let sharedQuery = sb
    .schema("catalog")
    .from("custom_playlists")
    .select("id, name, emoji, track_count, is_official")
    .or("is_public.eq.true,is_official.eq.true");
  if (userId) sharedQuery = sharedQuery.neq("owner_id", userId);
  sharedQuery = sharedQuery.order("name");

  const [{ data: mine, error: errMine }, { data: shared, error }] =
    await Promise.all([
      userId
        ? sb
            .schema("catalog")
            .from("custom_playlists")
            .select("id, name, emoji, track_count, is_official")
            .eq("owner_id", userId)
            .order("created_at", { ascending: false })
        : { data: [] },
      sharedQuery,
    ]);
  // Sans ce throw, une panne réseau donnait une liste vide sans explication
  if (error || errMine) throw error ?? errMine;

  const toItem = (p, group) => ({
    id: p.id,
    name: p.name,
    emoji: p.emoji || "🎵",
    trackCount: p.track_count,
    group,
  });

  // Une playlist officielle reste officielle même pour son propriétaire (le
  // compte admin qui les gère) : elle a sa pochette dans le bac à disques.
  const official = [...(mine ?? []), ...(shared ?? [])]
    .filter((p) => p.is_official)
    .sort((a, b) => (b.track_count ?? 0) - (a.track_count ?? 0))
    .map((p) => toItem(p, "official"));
  const own = (mine ?? [])
    .filter((p) => !p.is_official)
    .map((p) => toItem(p, "mine"));
  const community = (shared ?? [])
    .filter((p) => !p.is_official)
    .map((p) => toItem(p, "public"));

  return [...official, ...own, ...community];
}
