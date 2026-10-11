import { json } from "@sveltejs/kit";
import { requireAuth, checkRateLimit } from "$lib/server/middleware/auth.js";
import {
  checkVideo,
  pinVideoIfEmpty,
} from "$lib/server/services/trackVideo.js";

// POST /api/tracks/:id/video  { youtube_id }
// Fixe la vidéo d'un titre du catalogue, seulement s'il n'en a pas encore.
export async function POST({ request, params }) {
  const { user } = await requireAuth(request);
  checkRateLimit(`video:${user.id}`, 20, 60_000);

  const body = await request.json().catch(() => null);
  const youtubeId = await checkVideo(body?.youtube_id);
  if (!youtubeId)
    return json({ error: "Vidéo YouTube introuvable." }, { status: 400 });

  const pinned = await pinVideoIfEmpty(params.id, youtubeId);
  if (!pinned)
    return json(
      { error: "Ce titre a déjà une version vérifiée." },
      { status: 409 },
    );
  return json({ ok: true, youtube_id: youtubeId });
}
