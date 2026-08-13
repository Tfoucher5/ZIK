import { json } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { verifyToken } from "$lib/server/middleware/auth.js";
import { todayParis, canonicalTrackKey } from "$lib/zikle/shared.js";

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
    if (!user)
      return json(
        { error: "Connexion requise pour les archives" },
        { status: 401 },
      );
  }

  const sb = getAdminClient();
  // Comparaison sur artiste + titre normalisés, pas sur l'id : le catalogue
  // contient plusieurs entrées pour un même morceau (radio edit, remaster,
  // feat.), et proposer la mauvaise ne doit pas coûter un essai.
  const [song, guess] = await Promise.all([
    sb
      .from("daily_songs")
      .select("tracks(artist, title)")
      .eq("date", date)
      .single(),
    sb.from("tracks").select("artist, title").eq("id", trackId).maybeSingle(),
  ]);
  if (song.error || !song.data?.tracks)
    return json({ error: "Aucune chanson pour cette date" }, { status: 404 });

  const target = song.data.tracks;
  const proposed = guess.data;
  const correct =
    !!proposed &&
    canonicalTrackKey(target.artist, target.title) ===
      canonicalTrackKey(proposed.artist, proposed.title);

  return json({ correct });
}
