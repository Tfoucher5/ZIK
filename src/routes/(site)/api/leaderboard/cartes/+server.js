import { json } from "@sveltejs/kit";
import { cardsLeaderboardPage } from "$lib/server/services/cards/leaderboard.js";
import { makeCache } from "$lib/server/cache.js";

const cache = makeCache(60_000);

export async function GET({ url }) {
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0"));
  const cached = offset === 0 && cache.get();
  if (cached) return json(cached);
  try {
    const data = await cardsLeaderboardPage(offset);
    if (offset === 0) cache.set(data);
    return json(data);
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}
