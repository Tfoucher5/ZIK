import { fail } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { logAdminAction } from "$lib/server/middleware/auth.js";
import { todayParis } from "$lib/server/services/zikle.js";
import { fetchAllRows } from "$lib/admin/paginate.server.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PAST_DAYS = 30;
const NEXT_DAYS = 14;

function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function load() {
  const sb = getAdminClient();
  const today = todayParis();
  const from = addDays(today, -(PAST_DAYS - 1));
  const to = addDays(today, NEXT_DAYS);

  const [{ data: songs }, results, { count: poolCount }, { data: latestPool }] =
    await Promise.all([
      sb
        .from("daily_songs")
        .select("date, track_id, tracks(artist, title, cover_url)")
        .gte("date", from)
        .lte("date", to),
      fetchAllRows(() =>
        sb
          .from("daily_results")
          .select("id, date, attempts, won")
          .gte("date", from)
          .order("id"),
      ),
      sb.from("zikle_pool").select("track_id", { count: "exact", head: true }),
      sb
        .from("zikle_pool")
        .select("added_at")
        .order("added_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const songBy = new Map((songs || []).map((s) => [s.date, s]));
  const stats = new Map();
  for (const r of results) {
    const s = stats.get(r.date) ?? { players: 0, wins: 0, winAttempts: 0 };
    s.players++;
    if (r.won) {
      s.wins++;
      s.winAttempts += r.attempts;
    }
    stats.set(r.date, s);
  }

  const days = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const s = stats.get(d) ?? { players: 0, wins: 0, winAttempts: 0 };
    const song = songBy.get(d);
    days.push({
      date: d,
      track: song ? { id: song.track_id, ...song.tracks } : null,
      players: s.players,
      wins: s.wins,
      avgAttempts: s.wins
        ? Math.round((s.winAttempts / s.wins) * 10) / 10
        : null,
    });
  }

  return {
    today,
    days,
    poolCount: poolCount ?? 0,
    poolLastAdded: latestPool?.added_at || null,
  };
}

async function readDate(request) {
  const form = await request.formData();
  const date = String(form.get("date") || "");
  return { form, date: DATE_RE.test(date) ? date : null };
}

export const actions = {
  setTrack: async ({ request, locals }) => {
    const { form, date } = await readDate(request);
    const trackId = form.get("track_id");
    if (!date || !trackId) return fail(400, { error: "Choisis un titre." });
    const { error } = await getAdminClient()
      .from("daily_songs")
      .upsert({ date, track_id: trackId }, { onConflict: "date" });
    if (error) return fail(500, { error: error.message });
    await logAdminAction(
      locals.adminId,
      "zikle_set_track",
      trackId,
      "daily_song",
      { date },
    );
    return { done: "Titre programmé." };
  },

  rerollRandom: async ({ request, locals }) => {
    const { date } = await readDate(request);
    if (!date) return fail(400, { error: "Date invalide" });
    const sb = getAdminClient();
    const cutoff = addDays(date, -365);
    const [pool, recent] = await Promise.all([
      fetchAllRows(() =>
        sb.from("zikle_pool").select("track_id").order("track_id"),
      ),
      fetchAllRows(() =>
        sb
          .from("daily_songs")
          .select("track_id")
          .gt("date", cutoff)
          .order("date"),
      ),
    ]);
    const used = new Set(recent.map((r) => r.track_id));
    const candidates = pool
      .map((r) => r.track_id)
      .filter((id) => !used.has(id));
    if (!candidates.length)
      return fail(400, {
        error:
          "Plus aucun titre du pool n'est disponible (tous joués dans l'année). Ajoute des titres au pool.",
      });
    const trackId = candidates[Math.floor(Math.random() * candidates.length)];
    const { error } = await sb
      .from("daily_songs")
      .upsert({ date, track_id: trackId }, { onConflict: "date" });
    if (error) return fail(500, { error: error.message });
    await logAdminAction(
      locals.adminId,
      "zikle_reroll_random",
      trackId,
      "daily_song",
      { date },
    );
    return { done: "Nouveau titre tiré au hasard." };
  },

  unschedule: async ({ request, locals }) => {
    const { date } = await readDate(request);
    if (!date || date <= todayParis())
      return fail(400, { error: "Seul un jour à venir peut être libéré." });
    const { error } = await getAdminClient()
      .from("daily_songs")
      .delete()
      .eq("date", date);
    if (error) return fail(500, { error: error.message });
    await logAdminAction(
      locals.adminId,
      "zikle_unschedule",
      date,
      "daily_song",
    );
    return { done: "Le titre sera tiré au hasard ce jour-là." };
  },

  deleteDayResults: async ({ request, locals }) => {
    const { date } = await readDate(request);
    if (!date) return fail(400, { error: "Date invalide" });
    const { error, count } = await getAdminClient()
      .from("daily_results")
      .delete({ count: "exact" })
      .eq("date", date);
    if (error) return fail(500, { error: error.message });
    await logAdminAction(
      locals.adminId,
      "zikle_delete_day_results",
      date,
      "daily_results",
      { count },
    );
    return { done: `${count ?? 0} résultat(s) supprimé(s).` };
  },
};
