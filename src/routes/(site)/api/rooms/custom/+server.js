import { json } from "@sveltejs/kit";
import { buildTrack } from "$lib/server/services/music/playlist.js";
import { createCustomRoom } from "$lib/server/services/rooms/customRoom.js";
import { checkRateLimit } from "$lib/server/middleware/auth.js";

export async function POST({ request }) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  checkRateLimit(ip, 5, 60_000);

  const { name, emoji, tracks, maxRounds, roundDuration, breakDuration } =
    await request.json();
  if (!name?.trim() || !Array.isArray(tracks) || tracks.length < 3) {
    return json({ error: "name et au moins 3 tracks requis" }, { status: 400 });
  }

  const code = createCustomRoom({
    name,
    emoji,
    tracks: tracks
      .map((t) =>
        buildTrack({
          artist: String(t.artist || "").trim(),
          title: String(t.title || "").trim(),
          cover: t.cover_url,
          preview_url: t.preview_url,
          custom_artist: t.custom_artist || null,
          custom_title: t.custom_title || null,
          custom_feats: t.custom_feats || null,
          extraAnswers: (t.track_answers || []).map((a) => ({
            label: a.answer_types?.name || "",
            value: a.value,
          })),
        }),
      )
      .filter((t) => t.artist && t.title),
    maxRounds,
    roundDuration,
    breakDuration,
  });

  return json({ code });
}
