import { supabase } from "../../config.js";
import { YouTube } from "../../audio/youtube.js";
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
  return shuffle(all);
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
    const pinned = await YouTube.getVideo(
      `https://www.youtube.com/watch?v=${track.youtube_id}`,
    ).catch(() => null);
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
  const artist = track.mainArtist || track.artist;
  const results = filterVideos(
    await YouTube.search(`${artist} - ${track.title}`, {
      type: "video",
      limit: 5,
    }),
    exclude,
  );
  if (!results.length) throw new Error("No video");
  const video =
    results.find((v) => v.channel?.name?.endsWith("- Topic")) || results[0];
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
