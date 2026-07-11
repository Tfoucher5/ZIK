import { json } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { requireAuth, userClient } from "$lib/server/middleware/auth.js";
import { roomGames } from "$lib/server/state.js";
import { backfillCovers } from "$lib/server/services/coverBackfill.js";
import { seededShuffle } from "$lib/utils.js";

export async function GET({ request }) {
  const { user, token } = await requireAuth(request);
  const { data, error } = await userClient(token)
    .from("rooms")
    .select(
      "id, code, name, emoji, description, is_public, auto_start, game_mode, max_rounds, round_duration, break_duration, last_active_at, playlist_id, custom_playlists!playlist_id(track_count), room_playlists(playlist_id, position, custom_playlists(id, name, emoji, track_count))",
    )
    .eq("owner_id", user.id)
    .order("last_active_at", { ascending: false });
  if (error) return json({ error: error.message }, { status: 400 });

  const result = (data || []).map((r) => {
    const online = Object.values(roomGames)
      .filter((g) => g.roomId === r.code)
      .reduce(
        (acc, g) =>
          acc + Object.values(g.players).filter((p) => !p._dcTimer).length,
        0,
      );

    const playlists =
      r.room_playlists?.length > 0
        ? r.room_playlists
            .sort((a, b) => a.position - b.position)
            .map((rp) => rp.custom_playlists)
            .filter(Boolean)
        : r.custom_playlists
          ? [r.custom_playlists]
          : [];

    const track_count = playlists.reduce(
      (sum, pl) => sum + (pl?.track_count || 0),
      0,
    );

    const playlist_ids =
      r.room_playlists?.length > 0
        ? r.room_playlists
            .sort((a, b) => a.position - b.position)
            .map((rp) => rp.playlist_id)
        : r.playlist_id
          ? [r.playlist_id]
          : [];

    return {
      id: r.id,
      code: r.code,
      name: r.name,
      emoji: r.emoji,
      description: r.description,
      is_public: r.is_public,
      auto_start: r.auto_start,
      game_mode: r.game_mode || "classic",
      max_rounds: r.max_rounds,
      round_duration: r.round_duration,
      break_duration: r.break_duration,
      last_active_at: r.last_active_at,
      playlists,
      playlist_ids,
      track_count,
      online,
    };
  });

  const allPids = [...new Set(result.flatMap((r) => r.playlist_ids))];
  let coverMap = {};
  if (allPids.length > 0) {
    const { data: tc } = await getAdminClient().rpc("get_covers_by_playlists", {
      pids: allPids,
      max_per_playlist: 144,
    });
    for (const [pid, covers] of Object.entries(tc || {})) {
      coverMap[pid] = new Set(covers);
    }
  }

  const response = result.map((r) => ({
    ...r,
    covers: seededShuffle(
      [...new Set(r.playlist_ids.flatMap((pid) => [...(coverMap[pid] || [])]))],
      r.id,
    ).slice(0, 144),
  }));

  // Backfill en arrière-plan pour les playlists sans cover_url en BDD
  const emptyPids = [
    ...new Set(
      response
        .filter((r) => r.covers.length === 0)
        .flatMap((r) => r.playlist_ids),
    ),
  ];
  if (emptyPids.length) backfillCovers(emptyPids).catch(() => {});

  return json(response);
}
