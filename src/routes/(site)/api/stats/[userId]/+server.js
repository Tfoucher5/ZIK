import { json } from "@sveltejs/kit";
import { supabase } from "$lib/server/config.js";

function buildModeStats(rows, roomMap) {
  // Best scores par room officielle
  const bestByRoom = {};
  const officialRoomInfo = {};
  rows.forEach((row) => {
    const roomId = row.games?.room_id;
    const room = roomMap[roomId];
    if (!room?.is_official) return;
    if (!bestByRoom[roomId] || row.score > bestByRoom[roomId])
      bestByRoom[roomId] = row.score;
    officialRoomInfo[roomId] = room;
  });

  // Répartition par type de room
  const scoreByRoomType = {
    official: { count: 0, totalScore: 0 },
    public: { count: 0, totalScore: 0 },
    private: { count: 0, totalScore: 0 },
  };
  rows.forEach((row) => {
    const room = roomMap[row.games?.room_id];
    const type = room?.is_official
      ? "official"
      : room?.is_public
        ? "public"
        : "private";
    scoreByRoomType[type].count++;
    scoreByRoomType[type].totalScore += row.score;
  });

  const wins = rows.filter((r) => r.rank === 1).length;
  const podiums = rows.filter((r) => r.rank && r.rank <= 3).length;
  const scores = rows.map((r) => r.score);
  const totalScore = scores.reduce((a, b) => a + b, 0);
  const bestScore = scores.length ? Math.max(...scores) : 0;
  const worstScore = scores.length ? Math.min(...scores) : 0;
  const bestRank = rows.length
    ? Math.min(...rows.map((r) => r.rank ?? 999))
    : null;

  const recentGames = rows.slice(0, 10).map((row) => {
    const room = roomMap[row.games?.room_id];
    return {
      score: row.score,
      rank: row.rank,
      endedAt: row.games.ended_at,
      roomName: room?.name ?? "Room custom",
      roomEmoji: room?.emoji ?? "🎮",
    };
  });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const gamesThisMonth = rows.filter(
    (r) => new Date(r.games.ended_at) >= startOfMonth,
  ).length;

  return {
    bestByRoom,
    roomInfo: officialRoomInfo,
    recentGames,
    scoreByRoomType,
    winRate: { wins, total: rows.length },
    podiums,
    totalScore,
    bestScore,
    worstScore,
    bestRank,
    gamesThisMonth,
  };
}

export async function GET({ params, url }) {
  try {
    const elo = parseInt(url.searchParams.get("elo") || "0");

    const [roomsRes, playersRes, aboveRes, totalRes] = await Promise.all([
      supabase
        .from("rooms")
        .select("code, name, emoji, is_official, is_public"),
      supabase
        .from("game_players")
        .select("score, rank, games!inner(room_id, ended_at, mode)")
        .eq("user_id", params.userId)
        .eq("is_guest", false)
        .not("games.ended_at", "is", null),
      elo > 0
        ? supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .gt("elo", elo)
        : Promise.resolve({ count: 0 }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);

    if (playersRes.error)
      return json({ error: playersRes.error.message }, { status: 500 });

    const roomMap = {};
    (roomsRes.data || []).forEach((r) => {
      roomMap[r.code] = r;
    });

    const rows = playersRes.data || [];
    rows.sort(
      (a, b) => new Date(b.games.ended_at) - new Date(a.games.ended_at),
    );

    const classicRows = rows.filter((r) => r.games?.mode !== "qcm");
    const qcmRows = rows.filter((r) => r.games?.mode === "qcm");

    const classic = buildModeStats(classicRows, roomMap);
    const qcm = buildModeStats(qcmRows, roomMap);

    // Top % classement
    const aboveCount = aboveRes.count ?? 0;
    const totalCount = totalRes.count ?? 1;
    const topPercent = Math.max(1, Math.ceil((aboveCount / totalCount) * 100));

    // Champs historiques (mode classique) conservés pour compatibilité
    return json({
      ...classic,
      qcm,
      topPercent,
    });
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}
