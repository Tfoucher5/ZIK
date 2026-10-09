import { error, fail } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { logAdminAction } from "$lib/server/middleware/auth.js";
import { getDayNumber } from "$lib/server/services/zikle.js";
import { fetchAllRows } from "$lib/admin/paginate.server.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function load({ params }) {
  const { date } = params;
  if (!DATE_RE.test(date)) throw error(400, "Date invalide");

  const sb = getAdminClient();
  const [{ data: daily }, results, dayNumber, { data: prev }, { data: next }] =
    await Promise.all([
      sb
        .from("daily_songs")
        .select("date, track_id, tracks(artist, title, cover_url)")
        .eq("date", date)
        .maybeSingle(),
      fetchAllRows(() =>
        sb
          .from("daily_results")
          .select(
            "id, user_id, attempts, won, solve_time_seconds, created_at, profiles(username)",
          )
          .eq("date", date)
          .order("created_at", { ascending: true }),
      ),
      getDayNumber(sb, date),
      sb
        .from("daily_songs")
        .select("date")
        .lt("date", date)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb
        .from("daily_songs")
        .select("date")
        .gt("date", date)
        .order("date")
        .limit(1)
        .maybeSingle(),
    ]);

  if (!daily) throw error(404, "Aucun Zikle à cette date");

  return {
    date,
    dayNumber,
    daily,
    results,
    prev: prev?.date ?? null,
    next: next?.date ?? null,
  };
}

export const actions = {
  setTrack: async ({ request, locals, params }) => {
    const form = await request.formData();
    const trackId = form.get("track_id");
    if (!DATE_RE.test(params.date) || !trackId)
      return fail(400, { error: "Choisis un titre." });
    const { error: err } = await getAdminClient()
      .from("daily_songs")
      .upsert({ date: params.date, track_id: trackId }, { onConflict: "date" });
    if (err) return fail(500, { error: err.message });
    await logAdminAction(
      locals.adminId,
      "zikle_set_track",
      trackId,
      "daily_song",
      { date: params.date },
    );
    return { done: "Titre changé." };
  },

  deleteResult: async ({ request, locals }) => {
    const form = await request.formData();
    const id = form.get("id");
    if (!id) return fail(400, { error: "Résultat introuvable" });
    const { error: err } = await getAdminClient()
      .from("daily_results")
      .delete()
      .eq("id", id);
    if (err) return fail(500, { error: err.message });
    await logAdminAction(
      locals.adminId,
      "zikle_delete_result",
      id,
      "daily_results",
    );
    return { done: "Résultat supprimé." };
  },

  deleteAllResults: async ({ locals, params }) => {
    if (!DATE_RE.test(params.date))
      return fail(400, { error: "Date invalide" });
    const { error: err, count } = await getAdminClient()
      .from("daily_results")
      .delete({ count: "exact" })
      .eq("date", params.date);
    if (err) return fail(500, { error: err.message });
    await logAdminAction(
      locals.adminId,
      "zikle_delete_day_results",
      params.date,
      "daily_results",
      { count },
    );
    return { done: `${count ?? 0} résultat(s) supprimé(s).` };
  },
};
