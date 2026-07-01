import { json } from "@sveltejs/kit";
import { supabase } from "$lib/server/config.js";
import { roomGames } from "$lib/server/state.js";

function makeCache(ttlMs) {
  let _data = null,
    _exp = 0;
  return {
    get() {
      return _exp > Date.now() ? _data : null;
    },
    set(v) {
      _data = v;
      _exp = Date.now() + ttlMs;
    },
  };
}
const _cache = makeCache(30_000);

export async function GET() {
  try {
    let base = _cache.get();
    if (!base) {
      const { data, error } = await supabase
        .from("rooms")
        .select(
          "code, name, emoji, description, game_mode, is_official, playlist_id",
        )
        .eq("is_official", true)
        .order("created_at");
      if (error) throw error;

      const playlistIds = (data || [])
        .filter((r) => r.playlist_id)
        .map((r) => r.playlist_id);
      let coverMap = {};
      if (playlistIds.length > 0) {
        const { data: tracks } = await supabase
          .from("custom_playlist_tracks")
          .select("playlist_id, cover_url")
          .in("playlist_id", playlistIds)
          .not("cover_url", "is", null)
          .order("position");
        for (const t of tracks || []) {
          if (!coverMap[t.playlist_id]) coverMap[t.playlist_id] = t.cover_url;
        }
      }

      base = (data || []).map((r) => ({
        id: r.code,
        name: r.name,
        emoji: r.emoji,
        description: r.description || "",
        game_mode: r.game_mode || "classic",
        cover_url: coverMap[r.playlist_id] || null,
        color: "var(--accent)",
        gradient: "linear-gradient(135deg,rgba(255,0,255,.08),transparent)",
      }));
      _cache.set(base);
    }
    const result = base
      .map((r) => ({
        ...r,
        online: Object.values(roomGames)
          .filter((g) => g.roomId === r.id)
          .reduce(
            (acc, g) =>
              acc + Object.values(g.players).filter((p) => !p._dcTimer).length,
            0,
          ),
      }))
      .sort((a, b) => b.online - a.online);

    const totalOnline = Object.values(roomGames).reduce(
      (acc, g) =>
        acc + Object.values(g.players).filter((p) => !p._dcTimer).length,
      0,
    );

    return json(
      { rooms: result, totalOnline },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}
