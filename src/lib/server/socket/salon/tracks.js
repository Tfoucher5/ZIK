import { supabase, getAdminClient } from "../../config.js";
import { displayString } from "../../services/music/trackText.js";
import {
  buildTrackFromRow,
  dedup,
  TRACK_ROW_SELECT,
} from "../../services/music/playlist.js";
import { fetchAllRows } from "../../services/admin/paginate.js";
import {
  DEFAULT_VIDEO_SETTINGS,
  getVideoSettings,
  pickStart,
} from "../../services/music/trackIssues.js";

const SETTINGS_WAIT_MS = 2000;

async function loadTracksForPlaylist(playlistId, client = supabase) {
  try {
    const rows = await fetchAllRows(() =>
      client
        .schema("catalog")
        .from("custom_playlist_tracks")
        .select(TRACK_ROW_SELECT)
        .eq("playlist_id", playlistId)
        .order("position")
        .order("id"),
    );
    return rows.map(buildTrackFromRow);
  } catch {
    // ignore
  }
  return [];
}

// Accepts a single ID or an array of IDs — returns combined, deduplicated, shuffled tracks
export async function loadSalonTracks(playlistIds, client = supabase) {
  const ids = Array.isArray(playlistIds) ? playlistIds : [playlistIds];
  const loaded = [];
  for (const id of ids) {
    const tracks = await loadTracksForPlaylist(id, client);
    for (const t of tracks) loaded.push({ ...t, playlistId: id });
  }
  const all = dedup(loaded);
  await loadVideoCache(all);
  return shuffle(all);
}

// Vidéos mémorisées (colonnes video_cache_*), remplies hors partie.
async function loadVideoCache(tracks) {
  const ids = [...new Set(tracks.map((t) => t.id).filter(Boolean))];
  const cache = new Map();
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await getAdminClient()
      .schema("catalog")
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

// Vidéo refusée par la TV : on ne la propose plus
export function forgetVideo(track) {
  if (!track.cachedVideo) return;
  const refused = track.cachedVideo.id;
  track.cachedVideo = null;
  getAdminClient()
    .schema("catalog")
    .from("tracks")
    .update({
      video_cache_id: null,
      video_cache_duration: null,
      video_cache_at: null,
      video_refused_id: refused,
      video_search_at: new Date().toISOString(),
    })
    .eq("id", track.id)
    .then(
      ({ error }) => {
        if (error) console.error("[forgetVideo]", error.message);
      },
      (e) => console.error("[forgetVideo]", e?.message ?? e),
    );
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

// Base bloquée : la manche part avec les réglages par défaut au lieu d'attendre
async function videoSettingsSoon() {
  let timer;
  const settings = await Promise.race([
    getVideoSettings(),
    new Promise((resolve) => {
      timer = setTimeout(
        () => resolve(DEFAULT_VIDEO_SETTINGS),
        SETTINGS_WAIT_MS,
      );
    }),
  ]);
  clearTimeout(timer);
  return settings;
}

// Vidéo déjà connue, sans appel YouTube : les recherches se font hors partie
// (services/music/videoResolver.js). Celle choisie dans l'admin prime.
export async function knownVideo(track, roundDuration) {
  const { minStart } = await videoSettingsSoon();
  if (track.youtube_id) {
    return {
      video: { id: track.youtube_id },
      // shortcut: durée d'une vidéo épinglée inconnue, l'extrait part de son début sans youtube_start ; à stocker si les hôtes s'en plaignent
      safeStart: pickStart({
        pinned: track.youtube_start,
        durationSec: 0,
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
  throw new Error("No video");
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
