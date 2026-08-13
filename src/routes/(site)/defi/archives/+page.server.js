import { getWeeklyChallengeArchives } from "$lib/server/services/weeklyChallenge.js";

export async function load() {
  const weeks = await getWeeklyChallengeArchives();
  return { weeks };
}
