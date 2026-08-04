import { json } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { verifyToken } from "$lib/server/middleware/auth.js";
import { todayParis } from "$lib/zikle/shared.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invalide" }, { status: 400 });
  }

  const date = body?.date;
  const trackId = body?.track_id;
  if (!DATE_RE.test(date) || !trackId)
    return json({ error: "date et track_id requis" }, { status: 400 });

  const today = todayParis();
  if (date > today) return json({ error: "Date invalide" }, { status: 400 });

  if (date !== today) {
    const token = request.headers.get("authorization")?.slice(7);
    const user = token ? await verifyToken(token) : null;
    if (!user) return json({ error: "Connexion requise pour les archives" }, { status: 401 });
  }

  const sb = getAdminClient();
  const { data, error } = await sb
    .from("daily_songs")
    .select("track_id")
    .eq("date", date)
    .single();
  if (error || !data) return json({ error: "Aucune chanson pour cette date" }, { status: 404 });

  return json({ correct: data.track_id === trackId });
}
