import { json } from "@sveltejs/kit";
import { requireAdminToken } from "$lib/server/middleware/auth.js";
import { getAdminClient } from "$lib/server/config.js";

const WEEKS = 8;

export async function GET({ url }) {
  await requireAdminToken(url.searchParams.get("token"));

  const { data, error } = await getAdminClient().rpc("admin_weekly_kpis", {
    p_weeks: WEEKS,
  });
  if (error) {
    return json(
      {
        error:
          "Fonction admin_weekly_kpis absente : appliquer les migrations 20260929_games_salon_stats.sql puis 20260930_admin_weekly_kpis.sql.",
      },
      { status: 503 },
    );
  }
  return json({ weeks: data });
}
