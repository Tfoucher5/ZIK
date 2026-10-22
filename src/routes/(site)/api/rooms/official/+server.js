import { json } from "@sveltejs/kit";
import { supabase } from "$lib/server/config.js";
import { makeCache } from "$lib/server/cache.js";
import {
  coversByPlaylist,
  onlineCount,
  totalOnline,
} from "$lib/server/services/rooms/roomList.js";

const cache = makeCache(30_000);

async function loadOfficialRooms() {
  const { data, error } = await supabase
    .from("rooms")
    .select("code, name, emoji, description, game_mode, playlist_id")
    .eq("is_official", true)
    .order("created_at");
  if (error) throw error;

  const covers = await coversByPlaylist(
    (data || []).map((r) => r.playlist_id).filter(Boolean),
    1,
  );
  return (data || []).map((r) => ({
    id: r.code,
    name: r.name,
    emoji: r.emoji,
    description: r.description || "",
    game_mode: r.game_mode || "classic",
    cover_url: covers[r.playlist_id]?.[0] ?? null,
    color: "var(--accent)",
    gradient: "linear-gradient(135deg,rgba(255,0,255,.08),transparent)",
  }));
}

export async function GET() {
  try {
    let base = cache.get();
    if (!base) {
      base = await loadOfficialRooms();
      cache.set(base);
    }
    const rooms = base
      .map((r) => ({ ...r, online: onlineCount(r.id) }))
      .sort((a, b) => b.online - a.online);

    return json(
      { rooms, totalOnline: totalOnline() },
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
