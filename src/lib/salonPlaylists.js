/** Playlist officielle cochée d'office : celle qui plaît au plus grand nombre en soirée. */
export const DEFAULT_SALON_PLAYLIST = "09a2742e-121d-4b99-8e94-290b7f4b5eb4";

/**
 * Playlists selectionnables pour un salon : celles de l'utilisateur, plus les
 * officielles et les publiques. Sans compte (userId null), seulement ces
 * dernieres. Partagee entre l'ecran de configuration et l'ecran hote, qui
 * proposent la meme liste. Ordre : officielles (la playlist par défaut en
 * tête), puis celles de l'utilisateur, puis les publiques.
 */
export async function loadSalonPlaylists(sb, userId) {
  let sharedQuery = sb
    .from("custom_playlists")
    .select("id, name, emoji, track_count, is_official")
    .or("is_public.eq.true,is_official.eq.true");
  if (userId) sharedQuery = sharedQuery.neq("owner_id", userId);
  sharedQuery = sharedQuery.order("name");

  const [{ data: mine }, { data: shared }] = await Promise.all([
    userId
      ? sb
          .from("custom_playlists")
          .select("id, name, emoji, track_count, is_official")
          .eq("owner_id", userId)
          .order("created_at", { ascending: false })
      : { data: [] },
    sharedQuery,
  ]);

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
    .sort(
      (a, b) =>
        (b.id === DEFAULT_SALON_PLAYLIST) - (a.id === DEFAULT_SALON_PLAYLIST) ||
        (b.track_count ?? 0) - (a.track_count ?? 0),
    )
    .map((p) => toItem(p, "official"));
  const own = (mine ?? [])
    .filter((p) => !p.is_official)
    .map((p) => toItem(p, "mine"));
  const community = (shared ?? [])
    .filter((p) => !p.is_official)
    .map((p) => toItem(p, "public"));

  return [...official, ...own, ...community];
}
