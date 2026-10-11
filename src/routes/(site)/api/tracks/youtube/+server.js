import { json } from "@sveltejs/kit";
import { requireAuth, checkRateLimit } from "$lib/server/middleware/auth.js";
import { ytVideoInfo } from "$lib/server/socket/game/audio.js";
import { extractYoutubeId } from "$lib/youtube.js";

// GET /api/tracks/youtube?id= : titre et chaîne d'une vidéo collée
export async function GET({ request, url }) {
  const { user } = await requireAuth(request);
  checkRateLimit(`ytinfo:${user.id}`, 20, 60_000);

  const id = extractYoutubeId(url.searchParams.get("id"));
  if (!id) return json({ error: "Lien YouTube invalide" }, { status: 400 });

  const info = await ytVideoInfo(id).catch(() => null);
  if (!info)
    return json({ error: "Vidéo YouTube introuvable." }, { status: 404 });
  return json({ id: info.id, title: info.title, channel: info.channel.name });
}
