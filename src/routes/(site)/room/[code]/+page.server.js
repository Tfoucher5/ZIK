import { supabase } from "$lib/server/config.js";
import { error } from "@sveltejs/kit";
import { topArtists } from "$lib/rooms/room-content.js";

async function loadTrackCount(playlistId) {
  if (!playlistId) return null;
  const { data } = await supabase
    .from("custom_playlists")
    .select("track_count")
    .eq("id", playlistId)
    .single();
  return data?.track_count ?? null;
}

async function loadArtists(playlistId) {
  if (!playlistId) return [];
  const { data } = await supabase
    .from("custom_playlist_tracks")
    .select("artist")
    .eq("playlist_id", playlistId);
  return topArtists(data ?? []);
}

async function loadLeaderboard(code) {
  const { data } = await supabase.rpc("weekly_leaderboard_by_room", {
    p_room_code: code,
  });
  return data ?? [];
}

export async function load({ params, setHeaders }) {
  const code = params.code.toUpperCase();

  const { data: room } = await supabase
    .from("rooms")
    .select(
      "code, name, emoji, description, is_public, is_official, game_mode, max_rounds, round_duration, playlist_id, last_active_at, profiles!owner_id(username)",
    )
    .eq("code", code)
    .eq("is_public", true)
    .single();

  if (!room) throw error(404, "Room introuvable ou privée");

  const [trackCount, artists, leaderboard] = await Promise.all([
    loadTrackCount(room.playlist_id),
    loadArtists(room.playlist_id),
    loadLeaderboard(room.code),
  ]);

  setHeaders({ "cache-control": "public, max-age=600" });

  return { room, trackCount, artists, leaderboard };
}
