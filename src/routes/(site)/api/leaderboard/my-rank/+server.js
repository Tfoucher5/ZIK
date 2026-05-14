import { json } from "@sveltejs/kit";
import { supabase } from "$lib/server/config.js";

const VALID_MODES = ["classique", "qcm", "elo"];
const VALID_ROOMS = ["officielles", "toutes"];
const VALID_PERIODS = ["semaine", "mois", "alltime"];

export async function GET({ url }) {
  const userId = url.searchParams.get("userId");
  if (!userId) return json(null);

  const mode = url.searchParams.get("mode") || "classique";
  const rooms = VALID_ROOMS.includes(url.searchParams.get("rooms"))
    ? url.searchParams.get("rooms")
    : "officielles";
  const periode = VALID_PERIODS.includes(url.searchParams.get("periode"))
    ? url.searchParams.get("periode")
    : "semaine";

  if (!VALID_MODES.includes(mode)) return json(null);

  try {
    if (mode === "elo") {
      const { data: me } = await supabase
        .from("profiles")
        .select("elo, level, games_played, username, avatar_url")
        .eq("id", userId)
        .single();
      if (!me) return json(null);

      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gt("elo", me.elo);

      return json({
        rank: (count ?? 0) + 1,
        score: me.elo,
        games_count: me.games_played,
        username: me.username,
        avatar_url: me.avatar_url,
      });
    }

    const { data, error } = await supabase.rpc("leaderboard_score_my_rank", {
      p_user_id: userId,
      p_mode: mode,
      p_rooms: rooms,
      p_period: periode,
    });

    if (error || !data?.length) return json(null);

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", userId)
      .single();

    return json({
      rank: Number(data[0].rank),
      score: Number(data[0].total_score),
      games_count: Number(data[0].games_count),
      username: profile?.username,
      avatar_url: profile?.avatar_url,
    });
  } catch {
    return json(null);
  }
}
