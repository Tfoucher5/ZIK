import { json } from "@sveltejs/kit";
import { checkRateLimit } from "$lib/server/middleware/auth.js";
import { trackQuery } from "$lib/server/services/music/deezerCatalog.js";

export async function GET({ request, params }) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  checkRateLimit(`dz-browse:${ip}`, 30, 60_000);
  if (!/^\d+$/.test(params.id))
    return json({ error: "ID invalide" }, { status: 400 });

  try {
    return json({ q: await trackQuery(params.id) });
  } catch (e) {
    return json({ error: e.message }, { status: 502 });
  }
}
