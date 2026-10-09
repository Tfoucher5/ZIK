import { getAdminClient } from "$lib/server/config.js";

const rows = ({ data }) => data ?? [];

export async function load({ url }) {
  const days = [7, 30, 90].includes(Number(url.searchParams.get("j")))
    ? Number(url.searchParams.get("j"))
    : 30;
  const sb = getAdminClient();
  const [
    audience,
    actives,
    signups,
    traffic,
    sources,
    landings,
    cohorts,
    breakdown,
  ] = await Promise.all([
    sb.rpc("admin_dau_wau_mau").then((r) => r.data?.[0] ?? null),
    sb.rpc("admin_active_players_per_day", { p_days: days }).then(rows),
    sb.rpc("admin_signups_per_day", { p_days: days }).then(rows),
    sb.rpc("admin_traffic_daily", { p_days: days }).then(rows),
    sb.rpc("admin_traffic_sources", { p_days: days }).then(rows),
    sb.rpc("admin_traffic_landings", { p_days: days, p_limit: 8 }).then(rows),
    sb
      .rpc("admin_retention_cohorts", { p_activity: "blindtest", p_weeks: 8 })
      .then(rows),
    sb.rpc("admin_activity_breakdown", { p_weeks: 8 }).then(rows),
  ]);

  const byMedium = {};
  for (const s of sources)
    byMedium[s.medium] = (byMedium[s.medium] ?? 0) + Number(s.n);

  return {
    days,
    audience,
    actives,
    signups,
    traffic: traffic.map((t) => ({ day: t.day, n: Number(t.n) })),
    mediums: Object.entries(byMedium)
      .map(([medium, n]) => ({ medium, n }))
      .sort((a, b) => b.n - a.n),
    sources: sources
      .map((s) => ({ source: s.source, medium: s.medium, n: Number(s.n) }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 10),
    landings: landings.map((l) => ({ path: l.landing_path, n: Number(l.n) })),
    cohorts,
    breakdown,
  };
}
