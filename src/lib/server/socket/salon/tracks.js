import { supabase, getAdminClient } from "../../config.js";
import { ytsQuery, ytVideoInfo } from "../game/audio.js";
import { displayString } from "../../services/music/trackText.js";
import {
  buildTrackFromRow,
  TRACK_ROW_SELECT,
} from "../../services/music/playlist.js";
import {
  getVideoSettings,
  filterVideos,
  pickStart,
} from "../../services/music/trackIssues.js";

async function loadTracksForPlaylist(playlistId, client = supabase) {
  try {
    const { data: rows } = await client
      .from("custom_playlist_tracks")
      .select(TRACK_ROW_SELECT)
      .eq("playlist_id", playlistId)
      .order("position");
    if (rows?.length) {
      return rows.map(buildTrackFromRow);
    }
  } catch {
    // ignore
  }
  return [];
}

// Accepts a single ID or an array of IDs — returns combined, deduplicated, shuffled tracks
export async function loadSalonTracks(playlistIds, client = supabase) {
  const ids = Array.isArray(playlistIds) ? playlistIds : [playlistIds];
  const seen = new Set();
  const all = [];
  for (const id of ids) {
    const tracks = await loadTracksForPlaylist(id, client);
    for (const t of tracks) {
      const key = `${t.artist}|${t.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        all.push({ ...t, playlistId: id });
      }
    }
  }
  await loadVideoCache(all);
  return shuffle(all);
}

// Vidéos mémorisées (colonnes video_cache_*) : une vidéo trouvée une fois ne
// dépend plus de la recherche YouTube. Lues et écrites à part : si la colonne
// manque, le salon marche comme avant.
async function loadVideoCache(tracks) {
  const ids = [...new Set(tracks.map((t) => t.id).filter(Boolean))];
  const cache = new Map();
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await getAdminClient()
      .from("tracks")
      .select("id, video_cache_id, video_cache_duration")
      .in("id", ids.slice(i, i + 300))
      .not("video_cache_id", "is", null);
    for (const r of data ?? []) cache.set(r.id, r);
  }
  for (const t of tracks) {
    const c = cache.get(t.id);
    if (c)
      t.cachedVideo = {
        id: c.video_cache_id,
        duration: c.video_cache_duration ?? 0,
      };
  }
}

function saveVideoCache(track, cached) {
  track.cachedVideo = cached;
  getAdminClient()
    .from("tracks")
    .update({
      video_cache_id: cached?.id ?? null,
      video_cache_duration: cached?.duration ?? null,
      video_cache_at: cached ? new Date().toISOString() : null,
    })
    .eq("id", track.id)
    .then(
      () => {},
      () => {},
    );
}

// Vidéo refusée par la TV : on ne la propose plus
export function forgetVideo(track) {
  if (track.cachedVideo) saveVideoCache(track, null);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Tire au hasard les titres d'une session dans le pool complet.
 * Les playlists fournissent leurs titres tour à tour, pour qu'une énorme
 * playlist n'écrase pas les petites. Les manches consomment le tableau par la
 * fin (pop), l'ordre est donc deja celui du jeu.
 */
export function buildSessionPlaylist(fullPlaylist, count) {
  const groups = new Map();
  for (const t of fullPlaylist) {
    if (!groups.has(t.playlistId)) groups.set(t.playlistId, []);
    groups.get(t.playlistId).push(t);
  }
  const queues = shuffle([...groups.values()].map((g) => shuffle([...g])));
  const picked = [];
  while (picked.length < count && queues.length) {
    for (let i = 0; i < queues.length && picked.length < count; i++) {
      picked.push(queues[i].pop());
      if (!queues[i].length) queues.splice(i--, 1);
    }
  }
  return shuffle(picked);
}

export async function searchTrackVideo(track, roundDuration) {
  const { exclude, minStart } = await getVideoSettings();
  // Vidéo choisie dans l'admin : elle prime sur la recherche
  if (track.youtube_id) {
    const pinned = await ytVideoInfo(track.youtube_id).catch(() => null);
    return {
      video: { id: track.youtube_id },
      safeStart: pickStart({
        pinned: track.youtube_start,
        durationSec: Math.round((pinned?.duration || 0) / 1000),
        roundDuration,
        minStart,
      }),
    };
  }
  if (track.cachedVideo) {
    return {
      video: { id: track.cachedVideo.id },
      safeStart: pickStart({
        pinned: null,
        durationSec: track.cachedVideo.duration,
        roundDuration,
        minStart,
      }),
    };
  }
  const artist = track.mainArtist || track.artist;
  const { results: found } = await ytsQuery(`${artist} - ${track.title}`);
  const results = filterVideos(found, exclude);
  if (!results.length) throw new Error("No video");
  const video =
    results.find((v) => v.channel?.name?.endsWith("- Topic")) || results[0];
  if (track.id)
    saveVideoCache(track, {
      id: video.id,
      duration: Math.round((video.duration || 0) / 1000),
    });
  return {
    video,
    safeStart: pickStart({
      pinned: null,
      durationSec: Math.round((video.duration || 0) / 1000),
      roundDuration,
      minStart,
    }),
  };
}

export function currentTrackInfo(salon) {
  const track = salon.game.currentTrack;
  if (!track) return null;
  return {
    artist: displayString(track.mainArtist || track.artist),
    title: displayString(track.title),
    cover: track.cover,
    correctChoiceIndex: salon.game.correctChoiceIndex,
  };
}
