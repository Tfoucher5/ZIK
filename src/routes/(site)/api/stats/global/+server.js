import { json } from "@sveltejs/kit";
import { supabase } from "$lib/server/config.js";

let _cache = null;
let _cacheExp = 0;

export async function GET() {
  if (_cache && _cacheExp > Date.now()) return json(_cache);

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
        .select("id", { count: "exact", head: true })
        .gte("started_at", since30d),
    ]);

    _cache = {
      users: users ?? 0,
      publicRooms: publicRooms ?? 0,
      publicPlaylists: publicPlaylists ?? 0,
      gamesMonth: gamesMonth ?? 0,
    };
    _cacheExp = Date.now() + 60_000;
    return json(_cache, {
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
