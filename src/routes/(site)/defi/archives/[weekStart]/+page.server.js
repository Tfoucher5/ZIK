import { error } from "@sveltejs/kit";
import { getWeeklyChallengeByWeekStart } from "$lib/server/services/weeklyChallenge.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function load({ params }) {
  if (!DATE_RE.test(params.weekStart)) throw error(400, "Date invalide");
  const week = await getWeeklyChallengeByWeekStart(params.weekStart);
  if (!week) throw error(404, "Défi introuvable pour cette semaine");
  return { week };
}
