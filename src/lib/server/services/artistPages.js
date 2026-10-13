import { supabase } from "$lib/server/config.js";
import {
  buildTrack,
  refreshExpiredPreviews,
} from "$lib/server/services/playlist.js";
import { createCustomRoom } from "$lib/server/services/customRoom.js";
import { slugify } from "$lib/slug.js";

/* Pages /blind-test/artiste/<slug> : une page par artiste assez présent dans
   le catalogue pour une vraie partie. Le seuil de fans Deezer écarte les
   pseudo-artistes de compilations (« Génération TV », « Musique De Film »). */
const MIN_TRACKS = 10;
const MIN_FANS = 50_000;
const PAGE = 1000;
const INDEX_TTL_MS = 6 * 60 * 60 * 1000;
const RELATED_LIMIT = 8;
const ROUNDS = 10;

async function fetchAll(build) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

async function buildIndex() {
  const [tracks, fans] = await Promise.all([
    fetchAll(() =>
      supabase
        .from("tracks")
        .select("artist")
        .not("preview_url", "is", null)
        .order("id"),
    ),
    fetchAll(() =>
      supabase
        .from("card_artists")
        .select("name, nb_fan")
        .gte("nb_fan", MIN_FANS)
        .order("deezer_id"),
    ),
  ]);

  const fanCount = new Map(fans.map((a) => [a.name.toLowerCase(), a.nb_fan]));
  const counts = new Map();
  for (const { artist } of tracks) {
    const name = artist?.trim();
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const bySlug = new Map();
  for (const [name, trackCount] of counts) {
    const nbFan = fanCount.get(name.toLowerCase());
    if (trackCount < MIN_TRACKS || !nbFan) continue;
    const slug = slugify(name);
    if (!slug || (bySlug.get(slug)?.nbFan ?? 0) >= nbFan) continue;
    bySlug.set(slug, { slug, name, trackCount, nbFan });
  }
  return [...bySlug.values()].sort((a, b) => b.nbFan - a.nbFan);
}

let index = null;

// Artistes jouables, du plus populaire au moins populaire.
export async function listArtists() {
  if (!index || index.expires < Date.now()) {
    const artists = buildIndex();
    index = { artists, expires: Date.now() + INDEX_TTL_MS };
    artists.catch(() => (index = null));
  }
  return index.artists;
}

export async function findArtist(slug) {
  return (await listArtists()).find((a) => a.slug === slug) ?? null;
}

async function artistTracks(name) {
  const { data, error } = await supabase
    .from("tracks")
    .select(
      "id, artist, title, cover_url, preview_url, preview_expires_at, external_id",
    )
    .eq("artist", name)
    .not("preview_url", "is", null)
    .order("title");
  if (error) throw new Error(error.message);
  return data;
}

// Artistes qui reviennent le plus dans les mêmes playlists publiques.
async function relatedArtists(artist, trackIds) {
  const { data: links } = await supabase
    .from("custom_playlist_tracks")
    .select("playlist_id")
    .in("track_id", trackIds.slice(0, 150))
    .limit(500);
  const playlistIds = [...new Set((links ?? []).map((l) => l.playlist_id))];
  if (!playlistIds.length) return [];

  const { data: rows } = await supabase
    .from("custom_playlist_tracks")
    .select("tracks(artist)")
    .in("playlist_id", playlistIds.slice(0, 30))
    .limit(3000);

  const known = new Map((await listArtists()).map((a) => [a.name, a]));
  const counts = new Map();
  for (const row of rows ?? []) {
    const name = row.tracks?.artist?.trim();
    if (name && name !== artist.name && known.has(name))
      counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, RELATED_LIMIT)
    .map(([name]) => ({ slug: known.get(name).slug, name }));
}

export async function artistPage(artist) {
  const tracks = await artistTracks(artist.name);
  return {
    titles: tracks.map((t) => t.title),
    cover: tracks.find((t) => t.cover_url)?.cover_url ?? null,
    related: await relatedArtists(
      artist,
      tracks.map((t) => t.id),
    ).catch(() => []),
  };
}

// Room éphémère de 10 titres de l'artiste tirés au hasard.
export async function startArtistRoom(artist) {
  const rows = (await artistTracks(artist.name))
    .sort(() => Math.random() - 0.5)
    .slice(0, ROUNDS)
    .map((t) => ({ tracks: t }));
  await refreshExpiredPreviews(rows);

  return createCustomRoom({
    name: `Blind test ${artist.name}`,
    emoji: "🎤",
    tracks: rows.map(({ tracks: t }) =>
      buildTrack({
        id: t.id,
        artist: t.artist,
        title: t.title,
        cover: t.cover_url,
        preview_url: t.preview_url,
        external_id: t.external_id,
      }),
    ),
    maxRounds: ROUNDS,
  });
}
