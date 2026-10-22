const DEEZER_HEADERS = { "User-Agent": "ZIK-BlindTest/1.0" };

export function parseExpFromUrl(url) {
  const m = url?.match(/hdnea=exp=(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export async function fetchDeezerTrackPreview(trackId) {
  try {
    const res = await fetch(`https://api.deezer.com/track/${trackId}`, {
      headers: DEEZER_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error || !data.preview) return null;
    return data.preview;
  } catch {
    return null;
  }
}

export async function iTunesPreviewSearch(artist, title) {
  if (!artist || !title) return null;
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${title}`)}&entity=musicTrack&limit=5`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const track = (data.results || []).find((r) => r.previewUrl);
    return track?.previewUrl || null;
  } catch {
    return null;
  }
}
