import { json } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";

let _cache = null,
  _exp = 0;

export async function GET({ url }) {
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0"));
  if (offset === 0 && _exp > Date.now()) return json(_cache);
  const { data, error } = await getAdminClient().rpc("cards_leaderboard", {
    p_offset: offset,
    p_limit: 20,
  });
  if (error) return json({ error: error.message }, { status: 500 });
  if (offset === 0) {
    _cache = data;
    _exp = Date.now() + 60_000;
  }
  return json(data);
}
