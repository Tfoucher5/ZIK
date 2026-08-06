import { getAdminClient } from "$lib/server/config.js";
import { requireAdmin, logAdminAction } from "$lib/server/middleware/auth.js";
import { refreshZiklePool, todayParis } from "$lib/server/services/zikle.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HISTORY_SIZE = 30;

export async function load() {
  const sb = getAdminClient();
  const today = todayParis();

  const [
    { data: todaySong },
    { data: todayStatsRows },
    { count: poolCount },
    { data: latestPool },
    { data: history },
    { data: perDay },
  ] = await Promise.all([
    sb
      .from("daily_songs")
      .select("id, date, track_id, tracks(artist, title, cover_url)")
      .eq("date", today)
      .maybeSingle(),
    sb.rpc("admin_zikle_today"),
    sb.from("zikle_pool").select("track_id", { count: "exact", head: true }),
    sb
      .from("zikle_pool")
      .select("added_at")
      .order("added_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb
      .from("daily_songs")
      .select("id, date, track_id, tracks(artist, title)")
      .order("date", { ascending: false })
      .limit(HISTORY_SIZE),
    sb.rpc("admin_zikle_per_day", { p_days: HISTORY_SIZE }),
  ]);

  const playsByDate = new Map((perDay || []).map((r) => [r.day, r.n]));

  return {
    today,
    todaySong: todaySong || null,
    todayStats: todayStatsRows?.[0] || null,
    poolCount: poolCount ?? 0,
    poolLastAdded: latestPool?.added_at || null,
    history: (history || []).map((h) => ({
      ...h,
      plays: playsByDate.get(h.date) ?? 0,
    })),
  };
}

export const actions = {
  setTrack: async ({ request }) => {
    const { adminUser, formData } = await requireAdmin(request);
    const date = formData.get("date");
    const trackId = formData.get("track_id");
    if (!DATE_RE.test(date) || !trackId)
      return { success: false, error: "Paramètres invalides" };
    const sb = getAdminClient();
    const { error: err } = await sb
      .from("daily_songs")
      .upsert({ date, track_id: trackId }, { onConflict: "date" });
    if (err) return { success: false, error: err.message };
    await logAdminAction(
      adminUser.id,
      "zikle_set_track",
      trackId,
      "daily_song",
      {
        date,
      },
    );
    return { success: true };
  },

  rerollRandom: async ({ request }) => {
    const { adminUser, formData } = await requireAdmin(request);
    const date = formData.get("date");
    if (!DATE_RE.test(date)) return { success: false, error: "Date invalide" };
    const sb = getAdminClient();

    const cutoff = new Date(`${date}T00:00:00Z`);
    cutoff.setUTCDate(cutoff.getUTCDate() - 365);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const [{ data: pool }, { data: recent }] = await Promise.all([
      sb.from("zikle_pool").select("track_id"),
      sb.from("daily_songs").select("track_id").gt("date", cutoffStr),
    ]);
    const used = new Set((recent || []).map((r) => r.track_id));
    const candidates = (pool || [])
      .map((r) => r.track_id)
      .filter((id) => !used.has(id));
    if (!candidates.length)
      return {
        success: false,
        error:
          "Pool épuisé (aucun morceau disponible hors des 365 derniers jours)",
      };
    const trackId = candidates[Math.floor(Math.random() * candidates.length)];

    const { error: err } = await sb
      .from("daily_songs")
      .upsert({ date, track_id: trackId }, { onConflict: "date" });
    if (err) return { success: false, error: err.message };
    await logAdminAction(
      adminUser.id,
      "zikle_reroll_random",
      trackId,
      "daily_song",
      { date },
    );
    return { success: true };
  },

  deleteDayResults: async ({ request }) => {
    const { adminUser, formData } = await requireAdmin(request);
    const date = formData.get("date");
    if (!DATE_RE.test(date)) return { success: false, error: "Date invalide" };
    const sb = getAdminClient();
    const { error: err, count } = await sb
      .from("daily_results")
      .delete({ count: "exact" })
      .eq("date", date);
    if (err) return { success: false, error: err.message };
    await logAdminAction(
      adminUser.id,
      "zikle_delete_day_results",
      date,
      "daily_results",
      { count },
    );
    return { success: true };
  },

  refreshPool: async ({ request }) => {
    const { adminUser } = await requireAdmin(request);
    const sb = getAdminClient();
    try {
      const result = await refreshZiklePool(sb, true);
      await logAdminAction(
        adminUser.id,
        "zikle_refresh_pool",
        null,
        "zikle_pool",
        result,
      );
      return { success: true, added: result.added };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
};
