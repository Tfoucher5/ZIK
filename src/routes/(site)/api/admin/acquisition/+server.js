import { json } from "@sveltejs/kit";
import { requireAdminToken } from "$lib/server/middleware/auth.js";
import { getAdminClient } from "$lib/server/config.js";

const CACHE_TTL = 15 * 60_000;
const WINDOW_DAYS = 30;
const LANDING_LIMIT = 10;

let _cache = null;
let _cacheExp = 0;

export async function GET({ url }) {
  await requireAdminToken(url.searchParams.get("token"));

  if (_cache && _cacheExp > Date.now()) return json(_cache);

  const sb = getAdminClient();
  const [sources, daily, landings] = await Promise.all([
    sb.rpc("admin_traffic_sources", { p_days: WINDOW_DAYS }),
    sb.rpc("admin_traffic_daily", { p_days: WINDOW_DAYS }),
    sb.rpc("admin_traffic_landings", {
      p_days: WINDOW_DAYS,
      p_limit: LANDING_LIMIT,
    }),
  ]);

  const rows = sources.data ?? [];
  const total = rows.reduce((sum, r) => sum + Number(r.n), 0);

  const data = {
    days: WINDOW_DAYS,
    total,
    sources: rows.map((r) => ({
      source: r.source,
      medium: r.medium,
      n: Number(r.n),
      share: total ? Math.round((Number(r.n) / total) * 100) : 0,
      lastSeen: r.last_seen,
    })),
    daily: (daily.data ?? []).map((d) => ({ day: d.day, n: Number(d.n) })),
    landings: (landings.data ?? []).map((l) => ({
      path: l.landing_path,
      n: Number(l.n),
    })),
  };

  _cache = data;
  _cacheExp = Date.now() + CACHE_TTL;
  return json(data);
}
