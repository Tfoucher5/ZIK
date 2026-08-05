import { json } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { checkRateLimit } from "$lib/server/middleware/auth.js";
import { escapeIlike, dedupById } from "$lib/zikle/shared.js";

export async function GET({ request, url }) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  checkRateLimit(ip, 30, 60_000);

  const q = url.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return json([]);

  const sb = getAdminClient();
  const pattern = `%${escapeIlike(q)}%`;
  const [byArtist, byTitle] = await Promise.all([
    sb
      .from("tracks")
      .select("id, artist, title, cover_url")
      .ilike("artist", pattern)
      .limit(8),
    sb
      .from("tracks")
      .select("id, artist, title, cover_url")
      .ilike("title", pattern)
      .limit(8),
  ]);
  if (byArtist.error)
    return json({ error: byArtist.error.message }, { status: 400 });
  if (byTitle.error)
    return json({ error: byTitle.error.message }, { status: 400 });

  const merged = dedupById([
    ...(byArtist.data || []),
    ...(byTitle.data || []),
  ]).slice(0, 8);
  return json(merged);
}
