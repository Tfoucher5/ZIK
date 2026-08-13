import { json } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { verifyToken } from "$lib/server/middleware/auth.js";
import { bumpWeeklyChallenge } from "$lib/server/services/weeklyChallenge.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invalide" }, { status: 400 });
  }

  const { date, attempts, won, solve_time_seconds, guesses } = body || {};
  if (
    !DATE_RE.test(date) ||
    !Number.isInteger(attempts) ||
    attempts < 1 ||
    attempts > 6 ||
    typeof won !== "boolean" ||
    !Array.isArray(guesses)
  )
    return json({ error: "Payload invalide" }, { status: 400 });

  const sb = getAdminClient();
  const { data: songRow, error: songErr } = await sb
    .from("daily_songs")
    .select("tracks(artist, title, cover_url)")
    .eq("date", date)
    .single();
  if (songErr || !songRow)
    return json({ error: "Aucune chanson pour cette date" }, { status: 404 });

  const token = request.headers.get("authorization")?.slice(7);
  const user = token ? await verifyToken(token) : null;

  let saved = null;
  if (user) {
    const { data, error } = await sb.rpc("zikle_complete", {
      p_user_id: user.id,
      p_date: date,
      p_attempts: attempts,
      p_won: won,
      p_solve_time_seconds: Number.isInteger(solve_time_seconds)
        ? solve_time_seconds
        : null,
      p_guesses: guesses,
    });
    if (error) return json({ error: error.message }, { status: 400 });
    saved = data?.[0] ?? null;
    if (saved?.is_new && saved.won) bumpWeeklyChallenge("zikle_wins", user.id, 1);
  }

  return json({ track: songRow.tracks, saved });
}
