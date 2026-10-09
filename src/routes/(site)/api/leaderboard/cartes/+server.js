import { json } from "@sveltejs/kit";
import { cardsLeaderboardPage } from "$lib/server/services/cardsLeaderboard.js";

let _cache = null,
  _exp = 0;

export async function GET({ url }) {
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0"));
  if (offset === 0 && _exp > Date.now()) return json(_cache);
  try {
    const data = await cardsLeaderboardPage(offset);
    if (offset === 0) {
      _cache = data;
      _exp = Date.now() + 60_000;
    }
    return json(data);
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}
