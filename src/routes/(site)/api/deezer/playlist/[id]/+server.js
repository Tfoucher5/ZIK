import { json } from "@sveltejs/kit";
import { checkRateLimit } from "$lib/server/middleware/auth.js";
import { deezerFetch } from "$lib/server/services/music/deezerClient.js";

export async function GET({ params, request }) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  checkRateLimit(ip, 10, 60_000);

  try {
    const plId = params.id;
    const opts = { bulk: true, timeout: 10000 };

    const data = await deezerFetch(`/playlist/${plId}`, opts);
    if (data.error)
      throw new Error(data.error.message || "Playlist introuvable");

    const total = data.nb_tracks || data.tracks?.total || 0;
    if (!total) throw new Error("Playlist vide ou priv\u00e9e");

    let allTracks = [];
    while (allTracks.length < Math.min(total, 1000)) {
      const index = allTracks.length;
      const nextData = await deezerFetch(
        `/playlist/${plId}/tracks?index=${index}&limit=100`,
        opts,
      ).catch(() => null);
      if (!nextData || nextData.error || !nextData.data?.length) break;
      allTracks = allTracks.concat(nextData.data);
      if (nextData.data.length < 100) break;
    }

    if (!allTracks.length)
      throw new Error(
        "Impossible de r\u00e9cup\u00e9rer les titres (playlist vide ou priv\u00e9e)",
      );

    const tracks = allTracks
      .filter((t) => t.readable !== false)
      .map((t) => ({
        external_id: String(t.id),
        source: "deezer",
        artist: t.artist.name,
        title: t.title,
        preview_url: t.preview || null,
        cover_url: t.album.cover_xl || t.album.cover_big || null,
      }));

    return json({
      name: data.title,
      cover: data.picture_xl || data.picture_big || null,
      tracks,
    });
  } catch (e) {
    return json({ error: e.message }, { status: 502 });
  }
}
