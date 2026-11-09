import { cleanString } from "./trackText.js";
import { deezerFetch } from "./deezerClient.js";

export function parseExpFromUrl(url) {
  const m = url?.match(/hdnea=exp=(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

const comparable = (s) =>
  cleanString((s ?? "").replace(/[\u2018\u2019]/g, "'")).replace(/\s+/g, " ");
// « Titre - Remastered 2011 » : la version n'entre pas dans la comparaison
const titleKey = (s) => comparable((s ?? "").split(" - ")[0]);
const noThe = (s) => s.replace(/^the /, "");
// Noms entiers : « Queen » ne doit jamais valider « Piano Queen »
const artistNames = (s) =>
  comparable(s)
    .split(/\s*(?:,|&|\b(?:et|and|feat\.?|ft\.?)(?=\s|$))\s*/)
    .map(noThe)
    .filter(Boolean);

function previewOf(results, artist, title) {
  const t = titleKey(title);
  if (!t) return null;
  const names = artistNames(artist);
  const candidates = results.filter(
    (r) => r.preview && titleKey(r.title) === t,
  );
  const same =
    candidates.find(
      (r) => noThe(comparable(r.artist)) === noThe(comparable(artist)),
    ) ??
    candidates.find((r) =>
      artistNames(r.artist).some((n) => names.includes(n)),
    );
  return same?.preview ?? null;
}

// Extrait trouvé par nom : seulement si l'artiste et le titre correspondent.
// Mieux vaut pas d'extrait qu'un autre morceau joué devant la salle.
export async function deezerPreviewMatch(artist, title) {
  try {
    const q = encodeURIComponent(`${artist} ${title.split(" - ")[0]}`);
    const { data } = await deezerFetch(`/search?q=${q}&limit=5`, {
      timeout: 5000,
    });
    return previewOf(
      (data ?? []).map((r) => ({
        preview: r.preview,
        artist: r.artist?.name,
        title: r.title_short ?? r.title,
      })),
      artist,
      title,
    );
  } catch {
    return null;
  }
}

export async function iTunesPreviewMatch(artist, title) {
  try {
    const q = encodeURIComponent(`${artist} ${title.split(" - ")[0]}`);
    const res = await fetch(
      `https://itunes.apple.com/search?term=${q}&entity=song&limit=5`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const { results } = await res.json();
    return previewOf(
      (results ?? []).map((r) => ({
        preview: r.previewUrl,
        artist: r.artistName,
        title: r.trackName,
      })),
      artist,
      title,
    );
  } catch {
    return null;
  }
}

export async function fetchDeezerTrackPreview(trackId) {
  try {
    const data = await deezerFetch(`/track/${trackId}`);
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
