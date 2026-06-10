import { supabase, getAdminClient } from "../config.js";

// Toutes les fonctions échouent en silence : si les tables/RPC de la migration
// 20260610_achievements_streaks_game_results ne sont pas encore en place,
// le jeu continue normalement sans succès.

let _admin = null;
function db() {
  if (_admin) return _admin;
  try {
    _admin = getAdminClient();
  } catch {
    _admin = supabase;
  }
  return _admin;
}

let _defs = null;
let _defsAt = 0;
const DEFS_TTL = 10 * 60 * 1000;

async function loadDefs() {
  if (_defs && Date.now() - _defsAt < DEFS_TTL) return _defs;
  const { data, error } = await supabase.from("achievements").select("*");
  if (error || !data?.length) return _defs || [];
  _defs = data;
  _defsAt = Date.now();
  return _defs;
}

function tierRank(level) {
  return { bronze: 1, silver: 2, gold: 3 }[level] || 0;
}

/**
 * Met à jour les streaks puis vérifie les succès d'un joueur en fin de partie.
 * gameData: { score, rank, totalPlayers, correctRounds, totalRounds }
 * Retourne la liste des nouveaux déblocages [{ id, name, icon, tier, rarity }].
 */
export async function checkAchievements(userId, gameData) {
  try {
    const won = gameData.rank === 1 && gameData.totalPlayers >= 2;

    const { data: streakRows } = await supabase.rpc("update_player_streaks", {
      p_user_id: userId,
      p_won: won,
    });
    const streaks = streakRows?.[0] || null;

    const defs = await loadDefs();
    if (!defs.length) return [];

    const [{ data: profile }, { data: owned }, winsRes, podiumRes] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("total_score, games_played")
          .eq("id", userId)
          .single(),
        supabase
          .from("user_achievements")
          .select("achievement_id, tier")
          .eq("user_id", userId),
        supabase
          .from("game_players")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("rank", 1),
        supabase
          .from("game_players")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .lte("rank", 3),
      ]);

    if (!profile) return [];
    const ownedSet = new Set(
      (owned || []).map((u) => `${u.achievement_id}:${u.tier || ""}`),
    );

    const values = {
      first_win: won ? 1 : 0,
      wins_count: winsRes.count ?? 0,
      podium_count: podiumRes.count ?? 0,
      streak_days: streaks?.best_streak ?? 0,
      win_streak: streaks?.best_win_streak ?? 0,
      big_game: gameData.score,
      perfect_game:
        gameData.totalRounds >= 5 &&
        gameData.correctRounds >= gameData.totalRounds
          ? 1
          : 0,
      score_total: profile.total_score ?? 0,
      games_played: profile.games_played ?? 0,
    };

    const ONE_TIME_TARGETS = { first_win: 1, big_game: 40, perfect_game: 1 };

    const unlocks = [];
    for (const def of defs) {
      const value = values[def.id];
      if (value === undefined) continue; // ex: early_adopter (manuel)

      if (def.type === "one_time") {
        const target = ONE_TIME_TARGETS[def.id] ?? 1;
        if (value >= target && !ownedSet.has(`${def.id}:`)) {
          unlocks.push({
            user_id: userId,
            achievement_id: def.id,
            tier: null,
            _meta: {
              id: def.id,
              name: def.name,
              icon: def.icon,
              tier: null,
              rarity: def.rarity,
            },
          });
        }
      } else if (Array.isArray(def.tiers)) {
        for (const t of def.tiers) {
          if (value >= t.target && !ownedSet.has(`${def.id}:${t.level}`)) {
            unlocks.push({
              user_id: userId,
              achievement_id: def.id,
              tier: t.level,
              _meta: {
                id: def.id,
                name: def.name,
                icon: def.icon,
                tier: t.level,
                rarity: t.rarity || def.rarity,
              },
            });
          }
        }
      }
    }

    if (!unlocks.length) return [];

    const { error } = await db()
      .from("user_achievements")
      .upsert(
        unlocks.map(({ user_id, achievement_id, tier }) => ({
          user_id,
          achievement_id,
          tier,
        })),
        { onConflict: "user_id,achievement_id,tier", ignoreDuplicates: true },
      );
    if (error) {
      console.error("Succès non sauvegardés:", error.message);
      return [];
    }

    return unlocks
      .map((u) => u._meta)
      .sort((a, b) => tierRank(a.tier) - tierRank(b.tier));
  } catch (e) {
    console.error("checkAchievements:", e.message);
    return [];
  }
}

/**
 * Stocke un résultat partageable. Retourne l'id (uuid) ou null.
 */
export async function saveGameResult(result) {
  try {
    const { data, error } = await db()
      .from("game_results")
      .insert({
        game_id: result.gameId,
        user_id: result.userId || null,
        username: result.username,
        score: result.score,
        rank: result.rank,
        total_players: result.totalPlayers,
        room_name: result.roomName,
        room_emoji: result.roomEmoji || null,
        achievement_ids: result.achievementIds || [],
      })
      .select("id")
      .single();
    if (error) return null;
    return data.id;
  } catch {
    return null;
  }
}
