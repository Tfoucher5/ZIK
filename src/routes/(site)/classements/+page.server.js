import { supabase } from "$lib/server/config.js";

export async function load() {
  const { data: eloTop20 } = await supabase
    .from("profiles")
    .select("username, avatar_url, elo, level, games_played")
    .order("elo", { ascending: false })
    .limit(20);

  return { eloTop20: eloTop20 ?? [] };
}
