import { json } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { playlistCache } from "$lib/server/state.js";
import { MIN_ROUNDS, MIN_TRACKS } from "$lib/server/socket/game/cards.js";
import {
  requireAuth,
  userClient,
  checkRateLimit,
} from "$lib/server/middleware/auth.js";
import {
  ROOM_PLAYLISTS_SELECT,
  roomPlaylists,
  onlineCount,
  withCovers,
} from "$lib/server/services/rooms/roomList.js";

export async function GET() {
  const { data, error } = await getAdminClient()
    .from("rooms")
    .select(
      `id, code, name, emoji, description, is_public, is_official, auto_start, game_mode, max_rounds, round_duration, break_duration, last_active_at, owner_id, profiles!owner_id(username, avatar_url), ${ROOM_PLAYLISTS_SELECT}`,
    )
    .eq("is_public", true)
    .order("last_active_at", { ascending: false })
    .limit(200);
  if (error) return json({ error: error.message }, { status: 400 });

  const result = (data || []).map((r) => {
    const { playlists, playlist_ids, track_count } = roomPlaylists(r);
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      emoji: r.emoji,
      description: r.description,
      is_public: r.is_public,
      is_official: r.is_official,
      auto_start: r.auto_start,
      game_mode: r.game_mode || "classic",
      max_rounds: r.max_rounds,
      round_duration: r.round_duration,
      break_duration: r.break_duration,
      last_active_at: r.last_active_at,
      owner_id: r.owner_id,
      profiles: r.profiles,
      playlists,
      playlist_ids,
      track_count,
      online: onlineCount(r.code),
      // Joueurs connectés à un compte : ceux qui comptent pour les cartes
      connected: onlineCount(r.code, { verifiedOnly: true }),
      // Titres dédoublonnés quand la playlist est en cache, comme en partie
      cards:
        (playlistCache[r.code]?.length ?? track_count) >= MIN_TRACKS &&
        r.max_rounds >= MIN_ROUNDS,
    };
  });

  // Rooms avec des joueurs connectés en tête : on y gagne des cartes à plusieurs
  result.sort((a, b) => (b.connected > 0) - (a.connected > 0));

  return json(await withCovers(result, 9));
}

export async function POST({ request }) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  checkRateLimit(ip, 10, 60_000);
  const { user, token } = await requireAuth(request);

  const body = await request.json();
  const {
    name,
    emoji,
    description,
    playlist_ids,
    is_public,
    max_rounds,
    round_duration,
    break_duration,
    auto_start,
    game_mode,
  } = body || {};
  if (!name?.trim()) return json({ error: "name requis" }, { status: 400 });
  if (!playlist_ids?.length)
    return json({ error: "Au moins une playlist requise" }, { status: 400 });

  const { data, error } = await userClient(token)
    .from("rooms")
    .insert({
      name: String(name).trim().slice(0, 60),
      emoji: emoji || "🎵",
      description: String(description || "").slice(0, 200),
      owner_id: user.id,
      playlist_id: playlist_ids[0] || null,
      is_public: is_public !== false,
      auto_start: auto_start === true,
      game_mode: game_mode === "qcm" ? "qcm" : "classic",
      max_rounds: Math.min(Math.max(parseInt(max_rounds) || 10, 3), 50),
      round_duration: Math.min(
        Math.max(parseInt(round_duration) || 30, 10),
        60,
      ),
      break_duration: Math.min(Math.max(parseInt(break_duration) || 7, 3), 15),
    })
    .select("id, code, name, emoji")
    .single();

  if (error) return json({ error: error.message }, { status: 400 });

  // Insérer les liaisons room <-> playlists
  const links = playlist_ids.map((pid, i) => ({
    room_id: data.id,
    playlist_id: pid,
    position: i,
  }));
  await userClient(token).from("room_playlists").insert(links);

  return json(data);
}
