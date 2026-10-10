import { getAdminClient } from "$lib/server/config.js";
import { error } from "@sveltejs/kit";
import { topArtists, artistFromRow } from "$lib/rooms/room-content.js";

// Client service : le lien d'invitation doit aussi ouvrir les rooms privées
const supabase = getAdminClient();

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
    .select("custom_artist, tracks(artist)")
    .eq("playlist_id", playlistId);
  return topArtists(
    (data ?? []).map((row) => ({ artist: artistFromRow(row) })),
  );
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
    .single();

  if (!room) throw error(404, "Room introuvable");

  const [trackCount, artists, leaderboard] = await Promise.all([
    loadTrackCount(room.playlist_id),
    loadArtists(room.playlist_id),
    loadLeaderboard(room.code),
  ]);

  setHeaders({
    "cache-control": room.is_public
      ? "public, max-age=600"
      : "private, no-store",
  });

  return { room, trackCount, artists, leaderboard };
}
