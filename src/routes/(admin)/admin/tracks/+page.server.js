import { getAdminClient } from "$lib/server/config.js";
import { logAdminAction } from "$lib/server/middleware/auth.js";
import { escapeIlike } from "$lib/zikle/shared.js";

const PAGE_SIZE = 50;
const SORTS = {
  recent: ["created_at", false],
  artist: ["artist", true],
  title: ["title", true],
};
const FILTERS = ["all", "nopin", "nopreview", "reported"];

export async function load({ url }) {
  const sb = getAdminClient();
  const q = url.searchParams.get("q") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const sort = SORTS[url.searchParams.get("sort")]
    ? url.searchParams.get("sort")
    : "recent";
  const filter = FILTERS.includes(url.searchParams.get("f"))
    ? url.searchParams.get("f")
    : "all";

  const head = (fn) =>
    fn(sb.from("tracks").select("id", { count: "exact", head: true })).then(
      (r) => r.count ?? 0,
    );

  const [total, pinned, noPreview, answers, issuesRes] = await Promise.all([
    head((x) => x),
    head((x) => x.not("youtube_id", "is", null)),
    head((x) => x.is("preview_url", null)),
    sb
      .from("track_answers")
      .select("id", { count: "exact", head: true })
      .then((r) => r.count ?? 0),
    sb.from("track_issues").select("track_id").eq("status", "open"),
  ]);
  const reportedIds = [
    ...new Set((issuesRes.data ?? []).map((i) => i.track_id)),
  ];

  const [col, asc] = SORTS[sort];
  let query = sb
    .from("tracks")
    .select(
      "id, artist, title, cover_url, preview_url, youtube_id, source, created_at",
      { count: "exact" },
    )
    .order(col, { ascending: asc })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (filter === "nopin") query = query.is("youtube_id", null);
  if (filter === "nopreview") query = query.is("preview_url", null);
  if (filter === "reported") query = query.in("id", reportedIds);
  if (q) {
    const pattern = `%${escapeIlike(q)}%`;
    query = query.or(`artist.ilike.${pattern},title.ilike.${pattern}`);
  }

  const nothing = filter === "reported" && !reportedIds.length;
  const {
    data: tracks,
    count,
    error: err,
  } = nothing ? { data: [], count: 0 } : await query;
  const ids = (tracks ?? []).map((t) => t.id);

  const [{ data: plRows }, { data: dsRows }] = await Promise.all([
    ids.length
      ? sb.from("custom_playlist_tracks").select("track_id").in("track_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? sb.from("daily_songs").select("track_id").in("track_id", ids)
      : Promise.resolve({ data: [] }),
  ]);

  const tally = (rows) => {
    const m = new Map();
    for (const r of rows ?? []) m.set(r.track_id, (m.get(r.track_id) || 0) + 1);
    return m;
  };
  const plCount = tally(plRows);
  const dsCount = tally(dsRows);
  const reported = new Set(reportedIds);

  return {
    tracks: (tracks ?? []).map((t) => ({
      ...t,
      playlistCount: plCount.get(t.id) || 0,
      zikleDays: dsCount.get(t.id) || 0,
      reported: reported.has(t.id),
    })),
    count: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    q,
    sort,
    filter,
    kpis: {
      total,
      pinned,
      nopin: total - pinned,
      nopreview: noPreview,
      reported: reportedIds.length,
      answers,
    },
    error: err?.message || null,
  };
}

export const actions = {
  editTrack: async ({ request, locals }) => {
    const fd = await request.formData();
    const id = fd.get("id");
    const artist = fd.get("artist")?.trim();
    const title = fd.get("title")?.trim();
    const coverUrl = fd.get("cover_url")?.trim() || null;
    if (!artist || !title)
      return {
        success: false,
        error: "L'artiste et le titre sont obligatoires.",
      };
    const { error: err } = await getAdminClient()
      .from("tracks")
      .update({ artist, title, cover_url: coverUrl })
      .eq("id", id);
    if (err) {
      return {
        success: false,
        error:
          err.code === "23505"
            ? "Un titre identique (artiste + titre) existe déjà."
            : err.message,
      };
    }
    await logAdminAction(locals.adminId, "edit_track", id, "track", {
      artist,
      title,
    });
    return { success: true };
  },

  deleteTrack: async ({ request, locals }) => {
    const fd = await request.formData();
    const id = fd.get("id");
    const sb = getAdminClient();
    const { data: track } = await sb
      .from("tracks")
      .select("artist, title")
      .eq("id", id)
      .single();
    const { error: err } = await sb.from("tracks").delete().eq("id", id);
    if (err) {
      return {
        success: false,
        error:
          err.code === "23503"
            ? "Impossible : ce titre est encore dans une playlist ou dans l'historique Zikle."
            : err.message,
      };
    }
    await logAdminAction(locals.adminId, "delete_track", id, "track", {
      artist: track?.artist,
      title: track?.title,
    });
    return { success: true, deleted: true };
  },
};
