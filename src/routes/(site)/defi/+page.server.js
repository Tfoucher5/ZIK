import {
  getOrCreateWeeklyChallenge,
  getWeeklyChallengeFullRanking,
} from "$lib/server/services/weeklyChallenge.js";

export async function load() {
  const challenge = await getOrCreateWeeklyChallenge();
  if (!challenge) return { challenge: null, ranking: [] };
  const ranking = await getWeeklyChallengeFullRanking(challenge.id);
  return { challenge, ranking };
}
