import { json } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { checkRateLimit } from "$lib/server/middleware/auth.js";
import { escapeIlike, dedupByTrack } from "$lib/zikle/shared.js";

export async function GET({ request, url }) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  checkRateLimit(ip, 30, 60_000);

  const q = url.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return json([]);

  const sb = getAdminClient();
  const pattern = `%${escapeIlike(q)}%`;
  // On remonte plus large que les 8 finaux : sans tri Postgres, un artiste avec
  // beaucoup de feats (ex. "Tiakola" dans "Gazo (feat. Tiakola)") pouvait noyer
  // le morceau exact hors des 8 résultats bruts.
  const [byArtist, byTitle] = await Promise.all([
    sb
      .from("tracks")
      .select("id, artist, title, cover_url")
      .ilike("artist", pattern)
      .limit(40),
    sb
      .from("tracks")
      .select("id, artist, title, cover_url")
      .ilike("title", pattern)
      .limit(40),
  ]);
  if (byArtist.error)
    return json({ error: byArtist.error.message }, { status: 400 });
  if (byTitle.error)
    return json({ error: byTitle.error.message }, { status: 400 });

  const qLower = q.toLowerCase();
  const rank = (t) => {
    const artist = t.artist.toLowerCase();
    if (artist === qLower) return 0;
    if (artist.startsWith(qLower)) return 1;
    if (t.title.toLowerCase().startsWith(qLower)) return 2;
    if (artist.includes(qLower)) return 3;
    return 4;
  };

  // Dédup par morceau et pas par id : les variantes d'un même titre (radio edit,
  // remaster, feat.) fusionnent en une suggestion, sous leur libellé le plus court.
  // Slice à 20 (pas 8) : un artiste avec beaucoup de titres exacts (ex. Tiakola
  // en solo) dépasse déjà les 8 sans compter les feats — la liste de suggestions
  // scrolle (cf. ZikleGame.svelte), pas besoin de couper aussi court.
  const merged = dedupByTrack([
    ...(byArtist.data || []),
    ...(byTitle.data || []),
  ])
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        a.artist.localeCompare(b.artist) ||
        a.title.localeCompare(b.title),
    )
    .slice(0, 20);
  return json(merged);
}
