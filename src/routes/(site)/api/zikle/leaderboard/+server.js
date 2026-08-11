import { json } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { verifyToken } from "$lib/server/middleware/auth.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET({ request, url }) {
  const date = url.searchParams.get("date");
  if (!DATE_RE.test(date))
    return json({ error: "date requise (YYYY-MM-DD)" }, { status: 400 });

  // Le user_id vient du token vérifié, jamais du client : il sert à marquer la
  // ligne du joueur et à la renvoyer même s'il est hors du top.
  const token = request.headers.get("authorization")?.slice(7);
  const user = token ? await verifyToken(token) : null;

  const sb = getAdminClient();
  const { data, error } = await sb.rpc("zikle_leaderboard", {
    p_date: date,
    p_user_id: user?.id ?? null,
  });
  if (error) return json({ error: error.message }, { status: 400 });
  return json(data || []);
}
