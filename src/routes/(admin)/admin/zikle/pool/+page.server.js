import { fail } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { logAdminAction } from "$lib/server/middleware/auth.js";
import { refreshZiklePool, todayParis } from "$lib/server/services/zikle.js";
import { escapeIlike } from "$lib/zikle/shared.js";
import { fetchAllRows } from "$lib/admin/paginate.server.js";

const PAGE_SIZE = 50;

function yearAgo() {
  const d = new Date(`${todayParis()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 365);
  return d.toISOString().slice(0, 10);
}

export async function load({ url }) {
  const sb = getAdminClient();
  const q = url.searchParams.get("q") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1") || 1);

  let query = sb
    .from("zikle_pool")
    .select(
      "track_id, added_at, tracks!inner(id, artist, title, cover_url, preview_url)",
      { count: "exact" },
    )
    .order("added_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) {
    const pattern = `%${escapeIlike(q)}%`;
    query = query.or(`artist.ilike.${pattern},title.ilike.${pattern}`, {
      foreignTable: "tracks",
    });
  }

  const [{ data: rows, count, error }, pool, played] = await Promise.all([
    query,
    fetchAllRows(() =>
      sb.from("zikle_pool").select("track_id, added_at").order("track_id"),
    ),
    fetchAllRows(() =>
      sb
        .from("daily_songs")
        .select("track_id, date")
        .gt("date", yearAgo())
        .order("date"),
    ),
  ]);

  const playedOn = new Map(played.map((p) => [p.track_id, p.date]));
  const available = pool.filter((p) => !playedOn.has(p.track_id)).length;
  const weekAgo = Date.now() - 7 * 86400_000;

  return {
    rows: (rows || []).map((r) => ({
      ...r,
      playedOn: playedOn.get(r.track_id) ?? null,
    })),
    total: count ?? 0,
    today: todayParis(),
    poolTotal: pool.length,
    available,
    addedThisWeek: pool.filter((p) => Date.parse(p.added_at) > weekAgo).length,
    lastAdded:
      pool.reduce((m, p) => (p.added_at > m ? p.added_at : m), "") || null,
    page,
    pageSize: PAGE_SIZE,
    q,
    error: error?.message || null,
  };
}

export const actions = {
  addToPool: async ({ request, locals }) => {
    const form = await request.formData();
    const trackId = form.get("track_id");
    if (!trackId) return fail(400, { error: "Choisis un titre." });
    const { error } = await getAdminClient()
      .from("zikle_pool")
      .upsert(
        { track_id: trackId },
        { onConflict: "track_id", ignoreDuplicates: true },
      );
    if (error) return fail(500, { error: error.message });
    await logAdminAction(
      locals.adminId,
      "zikle_add_to_pool",
      trackId,
      "zikle_pool",
    );
    return { done: "Titre ajouté au pool." };
  },

  removeFromPool: async ({ request, locals }) => {
    const form = await request.formData();
    const trackId = form.get("track_id");
    if (!trackId) return fail(400, { error: "Titre introuvable" });
    const { error } = await getAdminClient()
      .from("zikle_pool")
      .delete()
      .eq("track_id", trackId);
    if (error) return fail(500, { error: error.message });
    await logAdminAction(
      locals.adminId,
      "zikle_remove_from_pool",
      trackId,
      "zikle_pool",
    );
    return { done: "Titre retiré du pool." };
  },

  refreshPool: async ({ locals }) => {
    const sb = getAdminClient();
    const size = async () =>
      (
        await sb
          .from("zikle_pool")
          .select("track_id", { count: "exact", head: true })
      ).count ?? 0;
    try {
      const before = await size();
      const result = await refreshZiklePool(sb, true);
      const added = (await size()) - before;
      await logAdminAction(
        locals.adminId,
        "zikle_refresh_pool",
        null,
        "zikle_pool",
        { ...result, added },
      );
      return {
        done: added
          ? `${added} nouveau(x) titre(s) ajouté(s) depuis le top Deezer.`
          : "Le pool contient déjà tout le top Deezer du moment.",
      };
    } catch (e) {
      return fail(500, { error: `Deezer ne répond pas : ${e.message}` });
    }
  },
};
