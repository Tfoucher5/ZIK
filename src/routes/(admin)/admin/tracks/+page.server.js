import { getAdminClient } from "$lib/server/config.js";
import { requireAdmin, logAdminAction } from "$lib/server/middleware/auth.js";
import { escapeIlike } from "$lib/zikle/shared.js";

const PAGE_SIZE = 50;
const ALLOWED_SORT = ["created_at", "artist"];

export async function load({ url }) {
  const sb = getAdminClient();
  const q = url.searchParams.get("q") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const sortParam = url.searchParams.get("sort");
  const sort = ALLOWED_SORT.includes(sortParam) ? sortParam : "created_at";

  let query = sb
    .from("tracks")
    .select(
      "id, artist, title, cover_url, preview_url, source, created_at",
      { count: "exact" },
    )
    .order(sort, { ascending: sort === "artist" })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) {
    const pattern = `%${escapeIlike(q)}%`;
    query = query.or(`artist.ilike.${pattern},title.ilike.${pattern}`);
  }

  const { data: tracks, count, error: err } = await query;
  const ids = (tracks || []).map((t) => t.id);

  const [{ data: plRows }, { data: dsRows }] = await Promise.all([
    ids.length
      ? sb.from("custom_playlist_tracks").select("track_id").in("track_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? sb.from("daily_songs").select("track_id").in("track_id", ids)
      : Promise.resolve({ data: [] }),
  ]);

  const plCount = new Map();
  for (const r of plRows || [])
    plCount.set(r.track_id, (plCount.get(r.track_id) || 0) + 1);
  const dsCount = new Map();
  for (const r of dsRows || [])
    dsCount.set(r.track_id, (dsCount.get(r.track_id) || 0) + 1);

  return {
    tracks: (tracks || []).map((t) => ({
      ...t,
      playlistCount: plCount.get(t.id) || 0,
      zikleDays: dsCount.get(t.id) || 0,
    })),
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    q,
    sort,
    error: err?.message || null,
  };
}

export const actions = {
  editTrack: async ({ request }) => {
    const { adminUser, formData } = await requireAdmin(request);
    const id = formData.get("id");
    const artist = formData.get("artist")?.trim();
    const title = formData.get("title")?.trim();
    const coverUrl = formData.get("cover_url")?.trim() || null;
    if (!artist || !title)
      return { success: false, error: "Artiste et titre requis" };
    const sb = getAdminClient();
    const { error: err } = await sb
      .from("tracks")
      .update({ artist, title, cover_url: coverUrl })
      .eq("id", id);
    if (err) {
      if (err.code === "23505")
        return {
          success: false,
          error: "Un morceau identique (artiste + titre) existe déjà.",
        };
      return { success: false, error: err.message };
    }
    await logAdminAction(adminUser.id, "edit_track", id, "track", {
      artist,
      title,
    });
    return { success: true };
  },

  deleteTrack: async ({ request }) => {
    const { adminUser, formData } = await requireAdmin(request);
    const id = formData.get("id");
    const sb = getAdminClient();
    const { data: track } = await sb
      .from("tracks")
      .select("artist, title")
      .eq("id", id)
      .single();
    const { error: err } = await sb.from("tracks").delete().eq("id", id);
    if (err) {
      if (err.code === "23503")
        return {
          success: false,
          error:
            "Impossible de supprimer : ce morceau est utilisé dans une playlist ou dans l'historique Zikle.",
        };
      return { success: false, error: err.message };
    }
    await logAdminAction(adminUser.id, "delete_track", id, "track", {
      artist: track?.artist,
      title: track?.title,
    });
    return { success: true };
  },
};
