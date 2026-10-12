import { json } from "@sveltejs/kit";
import { supabase } from "$lib/server/config.js";
import { makeCache } from "$lib/server/cache.js";

const cache = makeCache(60_000);

export async function GET() {
  const cached = cache.get();
  if (cached) return json(cached);

  try {
    const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const [
      { count: users },
      { count: publicRooms },
      { count: publicPlaylists },
      { count: gamesMonth },
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("rooms")
        .select("id", { count: "exact", head: true })
        .eq("is_public", true),
      supabase
        .from("custom_playlists")
        .select("id", { count: "exact", head: true })
        .eq("is_public", true),
      supabase
        .from("games")
        .select("id, game_players!inner(id)", { count: "exact", head: true })
        .gte("started_at", since30d),
    ]);

    const stats = {
      users: users ?? 0,
      publicRooms: publicRooms ?? 0,
      publicPlaylists: publicPlaylists ?? 0,
      gamesMonth: gamesMonth ?? 0,
    };
    cache.set(stats);
    return json(stats, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch {
    return json(
      { users: 0, publicRooms: 0, publicPlaylists: 0, gamesMonth: 0 },
      { status: 500 },
    );
  }
}
