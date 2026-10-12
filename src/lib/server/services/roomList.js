import { getAdminClient } from "../config.js";
import { roomGames } from "../state.js";
import { seededShuffle } from "../../utils.js";

export const ROOM_PLAYLISTS_SELECT =
  "playlist_id, custom_playlists!playlist_id(id, name, track_count), room_playlists(playlist_id, position, custom_playlists(id, name, emoji, track_count))";

// Joueurs présents dans une room (les déconnectés en sursis ne comptent pas)
export function onlineCount(code, { verifiedOnly = false } = {}) {
  return Object.values(roomGames)
    .filter((g) => g.roomId === code)
    .reduce(
      (acc, g) =>
        acc +
        Object.values(g.players).filter(
          (p) => !p._dcTimer && (!verifiedOnly || p.verified),
        ).length,
      0,
    );
}

export function totalOnline() {
  return Object.values(roomGames).reduce(
    (acc, g) =>
      acc + Object.values(g.players).filter((p) => !p._dcTimer).length,
    0,
  );
}

// Playlists liées (room_playlists) ou, à défaut, l'ancienne playlist_id
export function roomPlaylists(r) {
  const links = [...(r.room_playlists ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const playlists = links.length
    ? links.map((rp) => rp.custom_playlists).filter(Boolean)
    : r.custom_playlists
      ? [r.custom_playlists]
      : [];
  const playlist_ids = links.length
    ? links.map((rp) => rp.playlist_id)
    : r.playlist_id
      ? [r.playlist_id]
      : [];
  const track_count = playlists.reduce(
    (sum, pl) => sum + (pl?.track_count || 0),
    0,
  );
  return { playlists, playlist_ids, track_count };
}

export async function coversByPlaylist(pids, maxPerPlaylist) {
  if (!pids.length) return {};
  const { data } = await getAdminClient().rpc("get_covers_by_playlists", {
    pids: [...new Set(pids)],
    max_per_playlist: maxPerPlaylist,
  });
  return data ?? {};
}

// Pochettes mélangées par room (même ordre pour une même room)
export async function withCovers(rooms, max) {
  const coverMap = await coversByPlaylist(
    rooms.flatMap((r) => r.playlist_ids),
    max,
  );
  return rooms.map((r) => ({
    ...r,
    covers: seededShuffle(
      [...new Set(r.playlist_ids.flatMap((pid) => coverMap[pid] ?? []))],
      r.id,
    ).slice(0, max),
  }));
}
