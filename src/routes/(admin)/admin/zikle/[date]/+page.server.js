import { error } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { requireAdmin, logAdminAction } from "$lib/server/middleware/auth.js";
import { getDayNumber } from "$lib/server/services/zikle.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function load({ params }) {
  const { date } = params;
  if (!DATE_RE.test(date)) throw error(400, "Date invalide");

  const sb = getAdminClient();
  const [{ data: daily }, { data: results }, dayNumber] = await Promise.all([
    sb
      .from("daily_songs")
      .select("id, date, track_id, tracks(artist, title, cover_url)")
      .eq("date", date)
      .maybeSingle(),
    sb
      .from("daily_results")
      .select(
        "id, user_id, attempts, won, solve_time_seconds, guesses, created_at, profiles(username)",
      )
      .eq("date", date)
      .order("created_at", { ascending: true }),
    getDayNumber(sb, date),
  ]);

  if (!daily) throw error(404, "Aucun jour Zikle à cette date");

  return {
    date,
    dayNumber,
    daily,
    results: results || [],
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

  deleteResult: async ({ request }) => {
    const { adminUser, formData } = await requireAdmin(request);
    const id = formData.get("id");
    const sb = getAdminClient();
    const { error: err } = await sb.from("daily_results").delete().eq("id", id);
    if (err) return { success: false, error: err.message };
    await logAdminAction(
      adminUser.id,
      "zikle_delete_result",
      id,
      "daily_results",
    );
    return { success: true };
  },

  deleteAllResults: async ({ request }) => {
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
};
