import { json } from "@sveltejs/kit";
import { requireAuth, userClient } from "$lib/server/middleware/auth.js";
import { backfillCovers } from "$lib/server/services/coverBackfill.js";
import {
  ROOM_PLAYLISTS_SELECT,
  roomPlaylists,
  onlineCount,
  withCovers,
} from "$lib/server/services/roomList.js";

export async function GET({ request }) {
  const { user, token } = await requireAuth(request);
  const { data, error } = await userClient(token)
    .from("rooms")
    .select(
      `id, code, name, emoji, description, is_public, auto_start, game_mode, max_rounds, round_duration, break_duration, last_active_at, ${ROOM_PLAYLISTS_SELECT}`,
    )
    .eq("owner_id", user.id)
    .order("last_active_at", { ascending: false });
  if (error) return json({ error: error.message }, { status: 400 });

  const result = (data || []).map((r) => ({
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
    ...roomPlaylists(r),
    online: onlineCount(r.code),
  }));

  const response = await withCovers(result, 144);

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
