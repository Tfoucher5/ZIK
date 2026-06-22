import { getFetch } from "./fetch.js";

// ─── Deezer search ────────────────────────────────────────────────────────────

export async function deezerSearch(artist, title) {
  if (!artist || !title) return null;
  const fetchFn = await getFetch();
  const q = `artist:"${artist.replace(/"/g, "")}" track:"${title.replace(/"/g, "")}"`;
  try {
    const res = await fetchFn(
      `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=3`,
      {
        headers: { "User-Agent": "ZIK-BlindTest/1.0" },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const track = data.data?.[0];
    if (!track) return null;
    return {
      title: track.title || null,
      artist: track.artist?.name || null,
      feats: [],
      coverUrl:
        track.album?.cover_xl ||
        track.album?.cover_big ||
        track.album?.cover_medium ||
        null,
      previewUrl: track.preview || null,
    };
  } catch {
    return null;
  }
}

// ─── iTunes Search ────────────────────────────────────────────────────────────

export async function iTunesSearch(artist, title) {
  if (!artist || !title) return null;
  const fetchFn = await getFetch();
  const q = `${artist} ${title}`;
  try {
    const res = await fetchFn(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=musicTrack&limit=1`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const track = data.results?.[0];
    if (!track) return null;
    return {
      coverUrl: track.artworkUrl100?.replace("100x100bb", "600x600bb") || null,
      previewUrl: track.previewUrl || null,
    };
  } catch {
    return null;
  }
}

// ─── Pipeline principal ───────────────────────────────────────────────────────

export async function enrichTrack(track) {
  const refArtist = track.custom_artist || track.artist || "";
  const refTitle = track.custom_title || track.title || "";

  const [dz, itunes] = await Promise.all([
    deezerSearch(refArtist, refTitle),
    iTunesSearch(refArtist, refTitle),
  ]);

  const updates = {};
  const changes = [];

  const allSources = [dz, itunes].filter(Boolean);
  const coverUrl = allSources.find((s) => s.coverUrl)?.coverUrl || null;
  const previewUrl = allSources.find((s) => s.previewUrl)?.previewUrl || null;

  if (coverUrl && !track.cover_url) {
    updates.cover_url = coverUrl;
    changes.push("cover ajoutée");
  }
  if (previewUrl && !track.preview_url) {
    updates.preview_url = previewUrl;
    changes.push("preview ajouté");
  }

  return { updates, changes };
}
