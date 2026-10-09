import { json } from "@sveltejs/kit";
import { requireAdminToken } from "$lib/server/middleware/auth.js";
import { getAdminClient } from "$lib/server/config.js";
import { sumWindow, computeDelta, pct } from "$lib/admin/stats-utils.js";

const CACHE_TTL = 5 * 60_000;
const _cache = new Map(); // days -> { data, exp }

export async function GET({ url }) {
  await requireAdminToken(url.searchParams.get("token"));
  const days = [7, 30, 90].includes(Number(url.searchParams.get("days")))
    ? Number(url.searchParams.get("days"))
    : 30;

  const hit = _cache.get(days);
  if (hit && hit.exp > Date.now()) return json(hit.data);

  const sb = getAdminClient();
  const today = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Europe/Paris",
  });
  const [pulse, weekly, signups, players, games, zikle, song, results] =
    await Promise.all([
      sb.rpc("admin_pulse", { p_days: days }),
      sb.rpc("admin_weekly_kpis", { p_weeks: 8 }),
      sb.rpc("admin_signups_per_day", { p_days: 14 }),
      sb.rpc("admin_active_players_per_day", { p_days: 14 }),
      sb.rpc("admin_games_per_day", { p_days: 14 }),
      sb.rpc("admin_zikle_per_day", { p_days: 14 }),
      sb
        .from("daily_songs")
        .select("tracks(artist, title)")
        .eq("date", today)
        .maybeSingle(),
      sb.from("daily_results").select("attempts, won").eq("date", today),
    ]);

  if (pulse.error) {
    return json(
      {
        error:
          "Fonction admin_pulse absente : appliquer la migration 20261009_admin_pulse.sql.",
      },
      { status: 503 },
    );
  }

  const p = pulse.data[0];
  const rolling = (serie) => {
    const value = sumWindow(serie ?? [], 7);
    return { value, delta: computeDelta(value, sumWindow(serie ?? [], 7, 7)) };
  };

  const zikleResults = results.data ?? [];
  const zikleBuckets = [
    { label: "1-2 essais", n: 0 },
    { label: "3 essais", n: 0 },
    { label: "4 essais", n: 0 },
    { label: "5-6 essais", n: 0 },
    { label: "Perdu", n: 0 },
  ];
  for (const r of zikleResults) {
    const i = !r.won
      ? 4
      : r.attempts <= 2
        ? 0
        : r.attempts <= 4
          ? r.attempts - 2
          : 3;
    zikleBuckets[i].n++;
  }

  const data = {
    days,
    north: {
      value: Number(p.north_7d),
      delta: Number(p.north_7d) - Number(p.north_prev_7d),
      target: 60,
      weeks: (weekly.data ?? []).map((w) => ({
        week: w.week,
        n: Number(w.rooms_multi) + Number(w.salons_multi),
      })),
    },
    week: {
      signups: rolling(signups.data),
      players: rolling(players.data),
      games: rolling(games.data),
      zikle: rolling(zikle.data),
    },
    goals: {
      activation: {
        pct: pct(Number(p.activation_played), Number(p.activation_cohort)),
        n: Number(p.activation_played),
        of: Number(p.activation_cohort),
        target: 60,
      },
      return: {
        pct: pct(Number(p.return_back), Number(p.return_cohort)),
        n: Number(p.return_back),
        of: Number(p.return_cohort),
        target: 20,
      },
      host: {
        pct: pct(Number(p.salon_invite_hosts), Number(p.salon_guests)),
        n: Number(p.salon_invite_hosts),
        of: Number(p.salon_guests),
        target: 5,
      },
      social: {
        pct: pct(Number(p.visits_social), Number(p.visits)),
        n: Number(p.visits_social),
        of: Number(p.visits),
        target: 10,
      },
    },
    zikle: {
      track: song.data?.tracks
        ? `${song.data.tracks.artist} · ${song.data.tracks.title}`
        : null,
      total: zikleResults.length,
      buckets: zikleBuckets,
    },
  };

  _cache.set(days, { data, exp: Date.now() + CACHE_TTL });
  return json(data);
}
