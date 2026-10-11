import { json } from "@sveltejs/kit";
import { checkRateLimit } from "$lib/server/middleware/auth.js";
import { suggestions } from "$lib/server/services/deezerCatalog.js";

// GET /api/deezer/suggest?ids=3135556,1109731 (titres Deezer de la playlist)
export async function GET({ request, url }) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  checkRateLimit(`dz-suggest:${ip}`, 20, 60_000);

  const ids = (url.searchParams.get("ids") || "")
    .split(",")
    .filter((id) => /^\d+$/.test(id))
    .slice(0, 8);
  if (!ids.length) return json([]);

  try {
    return json(await suggestions(ids));
  } catch (e) {
    return json({ error: e.message }, { status: 502 });
  }
}
