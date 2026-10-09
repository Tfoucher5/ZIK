import { error } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { logAdminAction } from "$lib/server/middleware/auth.js";
import { escapeIlike } from "$lib/zikle/shared.js";
import { forgetPlaylists } from "$lib/admin/contenu.server.js";

const SORTS = {
  tracks: ["track_count", false],
  recent: ["created_at", false],
  name: ["name", true],
};
const FILTERS = ["all", "official", "public", "private", "empty"];
const ALLOWED_FLAGS = ["is_official", "is_public"];
const PAGE_SIZE = 50;
const MONTH_MS = 30 * 86_400_000;

function filtered(query, filter) {
  if (filter === "official") return query.eq("is_official", true);
  if (filter === "public") return query.eq("is_public", true);
  if (filter === "private") return query.eq("is_public", false);
  if (filter === "empty") return query.eq("track_count", 0);
  return query;
}

async function playCounts(sb, linked) {
  const since = new Date(Date.now() - MONTH_MS).toISOString();
  const rows = await Promise.all(
    linked.map(async (p) => {
      const [all, month] = await Promise.all([
        sb
          .from("games")
          .select("id", { count: "exact", head: true })
          .eq("room_id", p.linked_room_id),
        sb
          .from("games")
          .select("id", { count: "exact", head: true })
          .eq("room_id", p.linked_room_id)
          .gte("started_at", since),
      ]);
      return { ...p, plays: all.count ?? 0, month: month.count ?? 0 };
    }),
  );
  return rows.sort((a, b) => b.plays - a.plays);
}

export async function load({ url }) {
  const sb = getAdminClient();
  const q = url.searchParams.get("q") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const sort = SORTS[url.searchParams.get("sort")]
    ? url.searchParams.get("sort")
    : "tracks";
  const filter = FILTERS.includes(url.searchParams.get("f"))
    ? url.searchParams.get("f")
    : "all";
  const [col, asc] = SORTS[sort];

  let query = filtered(
    sb
      .from("custom_playlists")
      .select(
        "id, name, emoji, owner_id, is_public, is_official, linked_room_id, track_count, created_at, updated_at, profiles!owner_id(username)",
        { count: "exact" },
      ),
    filter,
  )
    .order(col, { ascending: asc })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.ilike("name", `%${escapeIlike(q)}%`);

  const head = (fn) =>
    fn(
      sb.from("custom_playlists").select("id", { count: "exact", head: true }),
    ).then((r) => r.count ?? 0);

  const [list, total, official, pub, empty, entries, linkedRes] =
    await Promise.all([
      query,
      head((x) => x),
      head((x) => x.eq("is_official", true)),
      head((x) => x.eq("is_public", true)),
      head((x) => x.eq("track_count", 0)),
      sb
        .from("custom_playlist_tracks")
        .select("id", { count: "exact", head: true }),
      sb
        .from("custom_playlists")
        .select("id, name, emoji, linked_room_id")
        .not("linked_room_id", "is", null),
    ]);

  const top = await playCounts(sb, linkedRes.data ?? []);
  const plays = Object.fromEntries(top.map((p) => [p.id, p]));

  return {
    playlists: (list.data ?? []).map((p) => ({
      ...p,
      plays: plays[p.id]?.plays ?? null,
    })),
    count: list.count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    q,
    sort,
    filter,
    kpis: {
      total,
      official,
      public: pub,
      private: total - pub,
      empty,
      entries: entries.count ?? 0,
    },
    top: top.slice(0, 6),
    error: list.error?.message || null,
  };
}

export const actions = {
  toggleFlag: async ({ request, locals }) => {
    const fd = await request.formData();
    const id = fd.get("id");
    const field = fd.get("field");
    const value = fd.get("value") === "true";
    if (!ALLOWED_FLAGS.includes(field)) throw error(400, "Champ invalide");
    const { error: err } = await getAdminClient()
      .from("custom_playlists")
      .update({ [field]: value })
      .eq("id", id);
    if (err) return { success: false, error: err.message };
    await logAdminAction(
      locals.adminId,
      "toggle_playlist_flag",
      id,
      "playlist",
      {
        field,
        value,
      },
    );
    return { success: true };
  },

  editPlaylist: async ({ request, locals }) => {
    const fd = await request.formData();
    const id = fd.get("id");
    const name = fd.get("name")?.trim();
    const emoji = fd.get("emoji")?.trim() || "🎵";
    const linked_room_id =
      fd.get("linked_room_id")?.trim().toUpperCase() || null;
    if (!name) return { success: false, error: "Donne un nom à la playlist." };
    await forgetPlaylists([id]);
    const { error: err } = await getAdminClient()
      .from("custom_playlists")
      .update({ name, emoji, linked_room_id })
      .eq("id", id);
    if (err) return { success: false, error: err.message };
    await forgetPlaylists([id]);
    await logAdminAction(locals.adminId, "edit_playlist", id, "playlist", {
      name,
      emoji,
      linked_room_id,
    });
    return { success: true };
  },

  deletePlaylist: async ({ request, locals }) => {
    const fd = await request.formData();
    const id = fd.get("id");
    const sb = getAdminClient();
    const { data: playlist } = await sb
      .from("custom_playlists")
      .select("name, track_count")
      .eq("id", id)
      .single();
    await forgetPlaylists([id]);
    const { error: err } = await sb
      .from("custom_playlists")
      .delete()
      .eq("id", id);
    if (err) return { success: false, error: err.message };
    await logAdminAction(locals.adminId, "delete_playlist", id, "playlist", {
      name: playlist?.name,
      track_count: playlist?.track_count,
    });
    return { success: true };
  },
};
