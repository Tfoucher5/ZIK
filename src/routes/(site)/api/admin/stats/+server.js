import { error, json } from "@sveltejs/kit";
import { verifyToken } from "$lib/server/middleware/auth.js";
import { getAdminClient } from "$lib/server/config.js";
import { getUmamiData } from "$lib/server/umami.js";
import { sumWindow, computeDelta, toPercent } from "$lib/admin/stats-utils.js";

const CACHE_TTL = 5 * 60_000;
const _cache = new Map(); // days -> { data, exp }

async function checkAdmin(token) {
  if (!token) throw error(403, "Token manquant");
  const user = await verifyToken(token);
  if (!user) throw error(403, "Token invalide");
  const { data: profile } = await getAdminClient()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") throw error(403, "Accès refusé");
}

export async function GET({ url }) {
  await checkAdmin(url.searchParams.get("token"));
  const days = [30, 60, 90].includes(Number(url.searchParams.get("days")))
    ? Number(url.searchParams.get("days"))
    : 30;

  const hit = _cache.get(days);
  if (hit && hit.exp > Date.now()) return json(hit.data);

  const sb = getAdminClient();
  const [signups, players, games, ratio, retention, umami] = await Promise.all([
    sb.rpc("admin_signups_per_day", { p_days: days }),
    sb.rpc("admin_active_players_per_day", { p_days: days }),
    sb.rpc("admin_games_per_day", { p_days: days }),
    sb.rpc("admin_guest_ratio_7d"),
    sb.rpc("admin_retention_j7"),
    getUmamiData(days),
  ]);

  const s = (r) => r.data ?? [];
  const stat = (serie) => {
    const value = sumWindow(serie, 7);
    return { value, delta: computeDelta(value, sumWindow(serie, 7, 7)) };
  };

  const signupsSerie = s(signups);
  const { guests = 0, logged = 0 } = s(ratio)[0] ?? {};
  const { cohort_size = 0, retained = 0 } = s(retention)[0] ?? {};
  const signups7d = sumWindow(signupsSerie, 7);

  const data = {
    series: {
      visitors: umami?.visitors ?? [],
      signups: signupsSerie,
      players: s(players),
    },
    hero: {
      visitors7d: umami
        ? {
            value: umami.visitors7d,
            delta: computeDelta(umami.visitors7d, umami.visitors7dPrev),
          }
        : { value: null, delta: null },
      signups7d: stat(signupsSerie),
      players7d: stat(s(players)),
      games7d: stat(s(games)),
    },
    traffic: {
      referrers: umami?.referrers ?? [],
      pages: umami?.pages ?? [],
      available: Boolean(umami),
    },
    kpis: {
      conversionPct: umami ? toPercent(signups7d, umami.visitors7d) : null,
      guestPct: toPercent(guests, guests + logged),
      retention: {
        cohort: cohort_size,
        retained,
        pct: toPercent(retained, cohort_size),
      },
    },
  };

  _cache.set(days, { data, exp: Date.now() + CACHE_TTL });
  return json(data);
}
