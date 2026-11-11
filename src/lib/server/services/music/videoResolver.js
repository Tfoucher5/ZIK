import { getAdminClient } from "../../config.js";
import { salonRooms } from "../../state.js";
import { ytsQuery } from "../../socket/game/audio.js";
import { parseFeaturing } from "./trackText.js";
import { filterVideos, getVideoSettings } from "./trackIssues.js";
import { isProActive } from "../pro.js";

// Résout les vidéos des titres de playlists, hors partie : une soirée ne dépend
// jamais d'une recherche YouTube, elle lit tracks.video_cache_*.

const EVERY_MS = 30 * 1000;
const NOTHING_TO_DO_MS = 5 * 60 * 1000;
const BLOCKED_MS = 30 * 60 * 1000;
const RETRY_EMPTY_MS = 7 * 24 * 60 * 60 * 1000;
const PLAYING = ["round", "summary"];
const USUAL_EVERY_MS = 60 * 60 * 1000;
const USUAL_RETRY_MS = 5 * 60 * 1000;
const MAX_IDS = 300;
const PLAYED_SINCE_MS = 30 * 24 * 60 * 60 * 1000;
const TOP_ROOMS = 20;
const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export function pickVideo(results, exclude) {
  const kept = filterVideos(results, exclude);
  return kept.find((v) => v.channel?.name?.endsWith("- Topic")) || kept[0];
}

async function nextTrack(playlistIds) {
  const before = new Date(Date.now() - RETRY_EMPTY_MS).toISOString();
  let query = getAdminClient()
    .schema("catalog")
    .from("tracks")
    .select(
      "id, artist, title, video_refused_id, custom_playlist_tracks!inner(id)",
    )
    .is("youtube_id", null)
    .is("video_cache_id", null)
    .or(`video_search_at.is.null,video_search_at.lt.${before}`);
  if (playlistIds)
    query = query.in("custom_playlist_tracks.playlist_id", playlistIds);
  const { data, error } = await query
    .order("video_search_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data[0] ?? null;
}

function rowsOf({ data, error }) {
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function proPlaylists(db) {
  const subs = rowsOf(
    await db
      .from("pro_subscriptions")
      .select("user_id, status, current_period_end"),
  );
  const owners = subs.filter(isProActive).map((s) => s.user_id);
  if (!owners.length) return [];
  const ids = [];
  for (let i = 0; i < owners.length; i += MAX_IDS) {
    const lists = rowsOf(
      await db
        .schema("catalog")
        .from("custom_playlists")
        .select("id")
        .in("owner_id", owners.slice(i, i + MAX_IDS)),
    );
    ids.push(...lists.map((p) => p.id));
  }
  return ids;
}

// Mesuré sur les rooms en ligne (1000 dernières parties) : une partie de salon
// ne note pas ses playlists
async function mostPlayedPlaylists(db) {
  const since = new Date(Date.now() - PLAYED_SINCE_MS).toISOString();
  const games = rowsOf(
    await db
      .from("games")
      .select("room_id")
      .neq("source", "salon")
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(1000),
  );
  const plays = new Map();
  for (const g of games) plays.set(g.room_id, (plays.get(g.room_id) ?? 0) + 1);
  const top = [...plays.keys()]
    .sort((a, b) => plays.get(b) - plays.get(a))
    .slice(0, TOP_ROOMS);
  if (!top.length) return [];
  const rooms = rowsOf(
    await db
      .from("rooms")
      .select("code, playlist_id, room_playlists(playlist_id)")
      .in("code", top),
  );
  return rooms
    .sort((a, b) => plays.get(b.code) - plays.get(a.code))
    .flatMap((r) =>
      r.room_playlists?.length
        ? r.room_playlists.map((l) => l.playlist_id)
        : r.playlist_id
          ? [r.playlist_id]
          : [],
    );
}

let usual = { until: 0, groups: [] };

async function usualPlaylists() {
  if (Date.now() < usual.until) return usual.groups;
  const db = getAdminClient();
  const results = await Promise.allSettled([
    proPlaylists(db),
    mostPlayedPlaylists(db),
  ]);
  const failed = results.filter((r) => r.status === "rejected");
  for (const r of failed)
    console.warn("[vidéos] priorité indisponible :", r.reason?.message);
  usual = {
    until: Date.now() + (failed.length ? USUAL_RETRY_MS : USUAL_EVERY_MS),
    groups: results.map((r) => r.value ?? []),
  };
  return usual.groups;
}

// Salons ouverts, puis comptes Pro, puis rooms les plus jouées, puis le reste.
// Un groupe en erreur est sauté : il ne doit jamais arrêter le remplissage
async function nextPriorityTrack() {
  const open = Object.values(salonRooms)
    .flatMap((s) => s.settings?.playlistIds ?? [])
    .filter((id) => UUID.test(id));
  for (const group of [open, ...(await usualPlaylists())]) {
    const ids = [...new Set(group)].slice(0, MAX_IDS);
    if (!ids.length) continue;
    try {
      const track = await nextTrack(ids);
      if (track) return track;
    } catch (e) {
      console.warn("[vidéos] groupe prioritaire ignoré :", e?.message ?? e);
    }
  }
  return nextTrack();
}

async function saveSearch(trackId, fields) {
  const { error } = await getAdminClient()
    .schema("catalog")
    .from("tracks")
    .update({ video_search_at: new Date().toISOString(), ...fields })
    .eq("id", trackId);
  if (error) throw new Error(error.message);
}

const aRoundIsPlaying = () =>
  Object.values(salonRooms).some((s) => PLAYING.includes(s.game?.phase));

/** Résout un titre. Renvoie paused, idle, blocked, empty ou found. */
export async function resolveNextVideo() {
  // Pas de recherche pendant une manche. Un salon au repos ne bloque rien : une
  // TV restée allumée n'arrêterait pas le remplissage pour tout le monde
  if (aRoundIsPlaying()) return "paused";
  const track = await nextPriorityTrack();
  if (!track) return "idle";
  // Le choix du titre prend quelques requêtes : une manche a pu démarrer
  if (aRoundIsPlaying()) return "paused";

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
