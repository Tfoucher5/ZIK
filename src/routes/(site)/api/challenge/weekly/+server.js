import { json } from "@sveltejs/kit";
import { getWeeklyChallengeState } from "$lib/server/services/weeklyChallenge.js";
import { makeCache } from "$lib/server/cache.js";

const cache = makeCache(60_000);

export async function GET() {
  const cached = cache.get();
  if (cached) return json(cached);

  const state = await getWeeklyChallengeState();
  const payload = state ? { active: true, ...state } : { active: false };

  cache.set(payload);
  return json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
