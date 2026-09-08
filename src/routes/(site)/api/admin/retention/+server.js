import { json } from "@sveltejs/kit";
import { requireAdminToken } from "$lib/server/middleware/auth.js";
import { getAdminClient } from "$lib/server/config.js";
import { cohortCell, leverRow, stickiness } from "$lib/admin/stats-utils.js";

const CACHE_TTL = 15 * 60_000;
const COHORT_WEEKS = 12;
const FREQUENCY_DAYS = 30;
const AT_RISK_LIMIT = 20;
const ACTIVITIES = ["blindtest", "zikle", "defi"];

let _cache = null;
let _cacheExp = 0;

export async function GET({ url }) {
  await requireAdminToken(url.searchParams.get("token"));

  if (_cache && _cacheExp > Date.now()) return json(_cache);

  const sb = getAdminClient();
  const [
    cohortRes,
    frequency,
    gap,
    breakdown,
    dauWauMau,
    churn,
    atRisk,
    levers,
  ] = await Promise.all([
    Promise.all(
      ACTIVITIES.map((a) =>
        sb.rpc("admin_retention_cohorts", {
          p_activity: a,
          p_weeks: COHORT_WEEKS,
        }),
      ),
    ),
    sb.rpc("admin_return_frequency", { p_days: FREQUENCY_DAYS }),
    sb.rpc("admin_return_gap", { p_days: FREQUENCY_DAYS }),
    sb.rpc("admin_activity_breakdown", { p_weeks: COHORT_WEEKS }),
    sb.rpc("admin_dau_wau_mau"),
    sb.rpc("admin_churn_summary"),
    sb.rpc("admin_at_risk_users", { p_limit: AT_RISK_LIMIT }),
    sb.rpc("admin_retention_levers"),
  ]);

  const s = (r) => r.data ?? [];

  const cohorts = {};
  ACTIVITIES.forEach((activity, i) => {
    cohorts[activity] = s(cohortRes[i]).map((row) => ({
      week: row.cohort_week,
      size: row.cohort_size,
      cells: [row.w1, row.w2, row.w3, row.w4].map((retained) =>
        cohortCell(retained, row.cohort_size),
      ),
    }));
  });

  const { dau = 0, wau = 0, mau = 0 } = s(dauWauMau)[0] ?? {};
  const { active_30d = 0, churned = 0, at_risk = 0 } = s(churn)[0] ?? {};

  const data = {
    cohorts,
    frequency: {
      buckets: s(frequency).map((b) => ({ label: b.bucket, n: b.n })),
      medianGap: Number(gap.data ?? 0),
      days: FREQUENCY_DAYS,
    },
    breakdown: s(breakdown).map((w) => ({
      week: w.week,
      new: w.new_users,
      returning: w.returning_users,
      resurrected: w.resurrected,
    })),
    engagement: { dau, wau, mau, stickiness: stickiness(dau, mau) },
    churn: { active30d: active_30d, churned, atRisk: at_risk },
    atRiskUsers: s(atRisk).map((u) => ({
      id: u.id,
      username: u.username,
      lastActive: u.last_active,
      daysSince: u.days_since,
      activeDays: u.active_days,
    })),
    levers: s(levers).map(leverRow),
  };

  _cache = data;
  _cacheExp = Date.now() + CACHE_TTL;
  return json(data);
}
