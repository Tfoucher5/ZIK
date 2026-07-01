import { getAdminClient } from "$lib/server/config.js";
import { getSpotifyToken } from "./spotify.js";
import { getFetch } from "./fetch.js";

const _inProgress = new Set();

export async function backfillCovers(playlistIds) {
  const pids = playlistIds.filter((id) => !_inProgress.has(id));
  if (!pids.length) return;
  pids.forEach((id) => _inProgress.add(id));

  try {
    const admin = getAdminClient();
    const fetchFn = await getFetch();

    const { data: tracks } = await admin
      .from("custom_playlist_tracks")
      .select("id, external_id, source")
      .in("playlist_id", pids)
      .is("cover_url", null)
      .not("external_id", "is", null)
      .in("source", ["spotify", "deezer"])
      .limit(400);

    if (!tracks?.length) return;

    const spotify = tracks.filter((t) => t.source === "spotify");
    const deezer = tracks.filter((t) => t.source === "deezer");
    const updates = [];

    // Spotify : batch 50 par requête
    if (spotify.length) {
      try {
        const token = await getSpotifyToken();
        for (let i = 0; i < spotify.length; i += 50) {
          const batch = spotify.slice(i, i + 50);
          const ids = batch.map((t) => t.external_id).join(",");
          const res = await fetchFn(
            `https://api.spotify.com/v1/tracks?ids=${ids}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              signal: AbortSignal.timeout(12000),
            },
          );
          if (!res.ok) continue;
          const data = await res.json();
          batch.forEach((t, j) => {
            const cover =
              data.tracks?.[j]?.album?.images?.[1]?.url ||
              data.tracks?.[j]?.album?.images?.[0]?.url ||
              null;
            if (cover) updates.push({ id: t.id, cover_url: cover });
          });
        }
      } catch {}
    }

    // Deezer : parallèle par paquets de 10
    for (let i = 0; i < deezer.length; i += 10) {
      const batch = deezer.slice(i, i + 10);
      const results = await Promise.allSettled(
        batch.map(async (t) => {
          const res = await fetchFn(
            `https://api.deezer.com/track/${t.external_id}`,
            { signal: AbortSignal.timeout(8000) },
          );
          if (!res.ok) return null;
          const d = await res.json();
          const cover = d.album?.cover_xl || d.album?.cover_big || null;
          return cover ? { id: t.id, cover_url: cover } : null;
        }),
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) updates.push(r.value);
      }
    }

    if (!updates.length) return;

    await Promise.all(
      updates.map((u) =>
        admin
          .from("custom_playlist_tracks")
          .update({ cover_url: u.cover_url })
          .eq("id", u.id),
      ),
    );

    console.log(`[coverBackfill] ${updates.length} covers backfillées`);
  } catch (e) {
    console.warn("[coverBackfill] erreur :", e.message);
  } finally {
    pids.forEach((id) => _inProgress.delete(id));
  }
}
