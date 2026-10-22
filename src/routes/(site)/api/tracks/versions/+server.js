import { json } from "@sveltejs/kit";
import { requireAuth, checkRateLimit } from "$lib/server/middleware/auth.js";
import { listVersions } from "$lib/server/services/music/trackVideo.js";

// GET /api/tracks/versions?artist=&title=
export async function GET({ request, url }) {
  const { user } = await requireAuth(request);
  checkRateLimit(`versions:${user.id}`, 20, 60_000);

  const artist = url.searchParams.get("artist")?.trim();
  const title = url.searchParams.get("title")?.trim();
  if (!artist || !title)
    return json({ error: "artist et title requis" }, { status: 400 });

  return json(await listVersions(artist, title));
}
