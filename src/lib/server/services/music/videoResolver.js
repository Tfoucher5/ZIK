import { getAdminClient } from "../../config.js";
import { salonRooms } from "../../state.js";
import { ytsQuery } from "../../socket/game/audio.js";
import { parseFeaturing } from "./trackText.js";
import { filterVideos, getVideoSettings } from "./trackIssues.js";

// Résout les vidéos des titres de playlists, hors partie : une soirée ne dépend
// jamais d'une recherche YouTube, elle lit tracks.video_cache_*.

const EVERY_MS = 30 * 1000;
const NOTHING_TO_DO_MS = 5 * 60 * 1000;
const BLOCKED_MS = 30 * 60 * 1000;
const RETRY_EMPTY_MS = 7 * 24 * 60 * 60 * 1000;
const PLAYING = ["round", "summary"];

export function pickVideo(results, exclude) {
  const kept = filterVideos(results, exclude);
  return kept.find((v) => v.channel?.name?.endsWith("- Topic")) || kept[0];
}

async function nextTrack() {
  const before = new Date(Date.now() - RETRY_EMPTY_MS).toISOString();
  const { data, error } = await getAdminClient()
    .from("tracks")
    .select(
      "id, artist, title, video_refused_id, custom_playlist_tracks!inner(id)",
    )
    .is("youtube_id", null)
    .is("video_cache_id", null)
    .or(`video_search_at.is.null,video_search_at.lt.${before}`)
    .order("video_search_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data[0] ?? null;
}

async function saveSearch(trackId, fields) {
  const { error } = await getAdminClient()
    .from("tracks")
    .update({ video_search_at: new Date().toISOString(), ...fields })
    .eq("id", trackId);
  if (error) throw new Error(error.message);
}

/** Résout un titre. Renvoie paused, idle, blocked, empty ou found. */
export async function resolveNextVideo() {
  // Pas de recherche pendant une manche. Un salon au repos ne bloque rien : une
  // TV restée allumée n'arrêterait pas le remplissage pour tout le monde
  if (Object.values(salonRooms).some((s) => PLAYING.includes(s.game?.phase)))
    return "paused";
  const track = await nextTrack();
  if (!track) return "idle";

  const { main } = parseFeaturing(track.artist || "");
  const { results, failed } = await ytsQuery(`${main} - ${track.title}`);
  // Échec de la recherche : le titre n'est pas marqué, il sera repris
  if (failed) return "blocked";

  const { exclude } = await getVideoSettings();
  const video = pickVideo(
    results.filter((v) => v.id !== track.video_refused_id),
    exclude,
  );
  if (!video) {
    await saveSearch(track.id);
    return "empty";
  }
  await saveSearch(track.id, {
    video_cache_id: video.id,
    video_cache_duration: Math.round((video.duration || 0) / 1000),
    video_cache_at: new Date().toISOString(),
  });
  return "found";
}

export function nextDelay(result) {
  if (result === "blocked") return BLOCKED_MS;
  if (result === "idle") return NOTHING_TO_DO_MS;
  return EVERY_MS;
}

export function startVideoResolver() {
  // Sur Railway seulement : un poste de dev ne fait pas de recherches en fond
  if (!process.env.RAILWAY_ENVIRONMENT_NAME) return;
  const tick = async () => {
    let result = "blocked";
    try {
      result = await resolveNextVideo();
      if (result === "blocked")
        console.warn("[vidéos] recherche YouTube en échec, pause de 30 min");
    } catch (e) {
      console.warn("[vidéos]", e?.message ?? e);
    }
    setTimeout(tick, nextDelay(result)).unref?.();
  };
  setTimeout(tick, EVERY_MS).unref?.();
}
