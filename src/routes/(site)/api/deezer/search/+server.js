import { json } from "@sveltejs/kit";
import { checkRateLimit } from "$lib/server/middleware/auth.js";
import { searchTracks } from "$lib/server/services/music/deezerCatalog.js";

// Appelée pendant la frappe (anti-rebond côté client), d'où la limite large.
export async function GET({ request, url }) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  checkRateLimit(`dz-search:${ip}`, 90, 60_000);

  const q = url.searchParams.get("q")?.trim();
  if (!q) return json({ error: "Paramètre q requis" }, { status: 400 });

  try {
    return json(await searchTracks(q));
  } catch (e) {
    return json({ error: e.message }, { status: 502 });
  }
}
