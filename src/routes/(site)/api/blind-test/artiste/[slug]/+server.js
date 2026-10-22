import { error, json } from "@sveltejs/kit";
import { checkRateLimit } from "$lib/server/middleware/auth.js";
import {
  findArtist,
  startArtistRoom,
} from "$lib/server/services/music/artistPages.js";

export async function POST({ params, request }) {
  checkRateLimit(
    request.headers.get("x-forwarded-for") || "unknown",
    5,
    60_000,
  );
  const artist = await findArtist(params.slug);
  if (!artist) error(404, "Artiste introuvable");
  return json({ code: await startArtistRoom(artist) });
}
