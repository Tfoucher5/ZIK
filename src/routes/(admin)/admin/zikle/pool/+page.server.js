import { getAdminClient } from "$lib/server/config.js";
import { requireAdmin, logAdminAction } from "$lib/server/middleware/auth.js";
import { escapeIlike } from "$lib/zikle/shared.js";

const PAGE_SIZE = 50;

export async function load({ url }) {
  const sb = getAdminClient();
  const q = url.searchParams.get("q") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));

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

  const { data: rows, count, error: err } = await query;

  return {
    rows: rows || [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    q,
    error: err?.message || null,
  };
}

export const actions = {
  addToPool: async ({ request }) => {
    const { adminUser, formData } = await requireAdmin(request);
    const trackId = formData.get("track_id");
    if (!trackId) return { success: false, error: "track_id requis" };
    const sb = getAdminClient();
    const { error: err } = await sb
      .from("zikle_pool")
      .upsert(
        { track_id: trackId },
        { onConflict: "track_id", ignoreDuplicates: true },
      );
    if (err) return { success: false, error: err.message };
    await logAdminAction(
      adminUser.id,
      "zikle_add_to_pool",
      trackId,
      "zikle_pool",
    );
    return { success: true };
  },

  removeFromPool: async ({ request }) => {
    const { adminUser, formData } = await requireAdmin(request);
    const trackId = formData.get("track_id");
    if (!trackId) return { success: false, error: "track_id requis" };
    const sb = getAdminClient();
    const { error: err } = await sb
      .from("zikle_pool")
      .delete()
      .eq("track_id", trackId);
    if (err) return { success: false, error: err.message };
    await logAdminAction(
      adminUser.id,
      "zikle_remove_from_pool",
      trackId,
      "zikle_pool",
    );
    return { success: true };
  },
};
