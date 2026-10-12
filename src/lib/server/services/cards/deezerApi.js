import { getFetch } from "../fetch.js";
import { getSpotifyToken } from "../spotify.js";

const DEEZER = "https://api.deezer.com";
const HEADERS = { "User-Agent": "ZIK-BlindTest/1.0" };
const MIN_GAP_MS = 130; // Deezer : 50 requêtes / 5 s, on reste sous 8 / s
const MB_GAP_MS = 1_100; // MusicBrainz : 1 requête / s au maximum
const MB_HEADERS = {
  "User-Agent": "ZIK-BlindTest/1.0 ( https://www.zik-music.fr )",
};

let nextSlot = 0;
export async function deezer(path) {
  const wait = Math.max(0, nextSlot - Date.now());
  nextSlot = Math.max(nextSlot, Date.now()) + MIN_GAP_MS;
  if (wait) await new Promise((r) => setTimeout(r, wait));

  const fetchFn = await getFetch();
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetchFn(`${DEEZER}${path}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    const data = res?.ok ? await res.json().catch(() => null) : null;
    // Code 4 = quota dépassé : Deezer demande d'attendre quelques secondes
    if (data?.error?.code === 4) {
      await new Promise((r) => setTimeout(r, 5_000));
      continue;
    }
    return data && !data.error ? data : null;
  }
  return null;
}

// Date de première sortie d'un enregistrement, d'après MusicBrainz. Une
// remasterisation y est rattachée au même enregistrement que l'original : sa
// date est donc celle de la sortie d'origine, contrairement aux albums Deezer
// qui datent souvent la réédition.
let mbNextSlot = 0;
export async function firstReleaseFromIsrc(isrc) {
  if (!isrc) return null;
  const wait = Math.max(0, mbNextSlot - Date.now());
  mbNextSlot = Math.max(mbNextSlot, Date.now()) + MB_GAP_MS;
  if (wait) await new Promise((r) => setTimeout(r, wait));
  try {
    const fetchFn = await getFetch();
    const res = await fetchFn(
      `https://musicbrainz.org/ws/2/isrc/${encodeURIComponent(isrc)}?fmt=json`,
      { headers: MB_HEADERS, signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return null;
    const dates = ((await res.json()).recordings || [])
      .map((r) => r["first-release-date"])
      .filter(Boolean)
      .sort();
    return dates[0] || null;
  } catch {
    return null;
  }
}

export const albumCache = new Map();
export const artistCache = new Map();

export async function cached(cache, id, path) {
  if (!cache.has(id)) cache.set(id, deezer(path));
  return cache.get(id);
}

export async function spotifyIsrc(id) {
  try {
    const token = await getSpotifyToken();
    const fetchFn = await getFetch();
    const res = await fetchFn(`https://api.spotify.com/v1/tracks/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    return (await res.json()).external_ids?.isrc || null;
  } catch {
    return null;
  }
}

// Titre YouTube saisi à la place de l'artiste et du titre : on récupère le nom
// de la vidéo
export async function youtubeTitle(id) {
  try {
    const fetchFn = await getFetch();
    const res = await fetchFn(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`,
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) return null;
    const { title, author_name } = await res.json();
    const topic = String(author_name || "").match(/^(.+) - Topic$/);
    return topic ? `${topic[1]} - ${title}` : title;
  } catch {
    return null;
  }
}
