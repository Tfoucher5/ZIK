import { json } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET({ url }) {
  const date = url.searchParams.get("date");
  if (!DATE_RE.test(date))
    return json({ error: "date requise (YYYY-MM-DD)" }, { status: 400 });

  const sb = getAdminClient();
  const { data, error } = await sb.rpc("zikle_leaderboard", { p_date: date });
  if (error) return json({ error: error.message }, { status: 400 });
  return json(data || []);
}
