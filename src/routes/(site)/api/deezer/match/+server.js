import { json } from "@sveltejs/kit";
import { checkRateLimit } from "$lib/server/middleware/auth.js";
import { matchLines } from "$lib/server/services/deezerCatalog.js";

// POST /api/deezer/match { lines: ["Daft Punk - One More Time", ...] }
export async function POST({ request }) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  checkRateLimit(`dz-match:${ip}`, 6, 60_000);

  const body = await request.json().catch(() => null);
  const lines = body?.lines;
  if (!Array.isArray(lines) || !lines.length || lines.length > 100)
    return json({ error: "1 à 100 lignes" }, { status: 400 });

  return json(await matchLines(lines.map((l) => String(l).slice(0, 200))));
}
