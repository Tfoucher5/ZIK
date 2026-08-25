import { json } from "@sveltejs/kit";
import { getWeeklyChallengeState } from "$lib/server/services/weeklyChallenge.js";

let _cache = null;
let _cacheExp = 0;

export async function GET() {
  if (_cache && _cacheExp > Date.now()) return json(_cache);

  const state = await getWeeklyChallengeState();
  const payload = state ? { active: true, ...state } : { active: false };

  _cache = payload;
  _cacheExp = Date.now() + 60_000;
  return json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
