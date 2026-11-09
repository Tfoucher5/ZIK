import { json } from "@sveltejs/kit";
import { buildTrack } from "$lib/server/services/music/playlist.js";
import { createCustomRoom } from "$lib/server/services/rooms/customRoom.js";
import { checkRateLimit } from "$lib/server/middleware/auth.js";

const REFUS = "Il faut un nom et au moins 3 titres avec artiste et titre.";
const MAX_TITRES = 500;
const objet = (v) => v !== null && typeof v === "object";

export async function POST({ request }) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  checkRateLimit(ip, 5, 60_000);

  const { name, emoji, tracks, maxRounds, roundDuration, breakDuration } =
    (await request.json().catch(() => null)) ?? {};
  if (
    typeof name !== "string" ||
    !name.trim() ||
    !Array.isArray(tracks) ||
    tracks.length > MAX_TITRES
  ) {
    return json({ error: REFUS }, { status: 400 });
  }

  // Le plancher de 3 titres compte ceux qui restent jouables
  const jouables = tracks
    .filter(objet)
    .map((t) =>
      buildTrack({
        artist: String(t.artist || "").trim(),
        title: String(t.title || "").trim(),
        cover: t.cover_url,
        preview_url: t.preview_url,
        custom_artist: t.custom_artist || null,
        custom_title: t.custom_title || null,
        custom_feats: t.custom_feats || null,
        extraAnswers: (Array.isArray(t.track_answers) ? t.track_answers : [])
          .filter(objet)
          .map((a) => ({
            label: a.answer_types?.name || "",
            value: a.value,
          })),
      }),
    )
    .filter((t) => t.artist && t.title);
  if (jouables.length < 3) return json({ error: REFUS }, { status: 400 });

  const code = createCustomRoom({
    name,
    emoji,
    tracks: jouables,
    maxRounds,
    roundDuration,
    breakDuration,
  });

  return json({ code });
}
