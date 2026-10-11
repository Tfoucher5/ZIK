import { getFetch } from "./fetch.js";
import { matchScore, parseLine } from "../../playlist/input.js";
import { rankSuggestions } from "../../playlist/suggest.js";

const HEADERS = { "User-Agent": "ZIK-BlindTest/1.0" };
const HOUR = 60 * 60 * 1000;
const cache = new Map();

async function dz(path) {
  const fetchFn = await getFetch();
  const r = await fetchFn(`https://api.deezer.com${path}`, {
    headers: HEADERS,
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`Deezer HTTP ${r.status}`);
  const data = await r.json();
  if (data.error) throw new Error(data.error.message || "Deezer indisponible");
  return data;
}

async function cached(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.value;
  const value = await fn();
  cache.set(key, { value, exp: Date.now() + ttl });
  if (cache.size > 2000)
    for (const [k, v] of cache) if (v.exp < Date.now()) cache.delete(k);
  return value;
}

export function toTrack(t, album = t.album) {
  return {
    external_id: String(t.id),
    source: "deezer",
    artist: t.artist.name,
    artist_id: t.artist.id,
    title: t.title,
    preview_url: t.preview || null,
    cover_url: album?.cover_xl || album?.cover_big || null,
    album_id: album?.id ?? null,
    album: album?.title ?? null,
    rank: t.rank ?? 0,
  };
}

const playable = (t) => t.readable !== false;

export async function searchTracks(q, limit = 20) {
  const data = await dz(`/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  return (data.data || []).filter(playable).map((t) => toTrack(t));
}

export function artistPage(id) {
  return cached(`artist:${id}`, HOUR, async () => {
    const [artist, top, albums] = await Promise.all([
      dz(`/artist/${id}`),
      dz(`/artist/${id}/top?limit=25`),
      dz(`/artist/${id}/albums?limit=60`),
    ]);
    return {
      artist: {
        id: artist.id,
        name: artist.name,
        picture: artist.picture_medium,
      },
      tracks: (top.data || []).filter(playable).map((t) => toTrack(t)),
      albums: (albums.data || [])
        .map((a) => ({
          id: a.id,
          title: a.title,
          cover: a.cover_medium,
          year: a.release_date?.slice(0, 4) ?? "",
          type: a.record_type,
        }))
        .sort((a, b) => b.year.localeCompare(a.year)),
    };
  });
}

export function albumPage(id) {
  return cached(`album:${id}`, HOUR, async () => {
    const album = await dz(`/album/${id}`);
    return {
      album: {
        id: album.id,
        title: album.title,
        cover: album.cover_medium,
        artist: album.artist?.name ?? "",
        artist_id: album.artist?.id ?? null,
        year: album.release_date?.slice(0, 4) ?? "",
      },
      tracks: (album.tracks?.data || [])
        .filter(playable)
        .map((t) => toTrack(t, album)),
    };
  });
}

function artistOfTrack(trackId) {
  return cached(`track-artist:${trackId}`, 24 * HOUR, async () => {
    const t = await dz(`/track/${trackId}`);
    return t.artist?.id ?? null;
  });
}

function artistRadio(artistId) {
  return cached(`radio:${artistId}`, HOUR, async () => {
    const data = await dz(`/artist/${artistId}/radio?limit=40`);
    return (data.data || []).filter(playable).map((t) => toTrack(t));
  });
}

// Titres proches de l'ensemble de la playlist (voir rankSuggestions).
export async function suggestions(trackIds) {
  const artists = [
    ...new Set(
      (
        await Promise.all(
          trackIds.map((id) => artistOfTrack(id).catch(() => null)),
        )
      ).filter(Boolean),
    ),
  ];
  const radios = await Promise.all(
    artists.map((a) => artistRadio(a).catch(() => [])),
  );
  return rankSuggestions(radios, trackIds);
}

async function matchLine(line) {
  const parsed = parseLine(line);
  const q = parsed.artist
    ? `artist:"${parsed.artist}" track:"${parsed.title}"`
    : parsed.query;
  let picks = await searchTracks(q, 5).catch(() => []);
  if (!picks.length && parsed.artist)
    picks = await searchTracks(parsed.query, 5).catch(() => []);
  const scores = picks.map((t) => matchScore(parsed, t));
  const best = scores.indexOf(Math.max(0, ...scores));
  if (best > 0) picks.unshift(...picks.splice(best, 1));
  return {
    line,
    artist: parsed.artist,
    title: parsed.title,
    status: scores[best] > 0 ? "ok" : picks.length ? "doubt" : "none",
    picks: picks.slice(0, 3),
  };
}

// Une liste collée → le titre Deezer le plus probable pour chaque ligne.
// 4 requêtes en parallèle : Deezer tolère 50 requêtes / 5 s.
export async function matchLines(lines) {
  const out = new Array(lines.length);
  let next = 0;
  const worker = async () => {
    while (next < lines.length) {
      const i = next++;
      out[i] = await matchLine(lines[i]);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return out;
}
