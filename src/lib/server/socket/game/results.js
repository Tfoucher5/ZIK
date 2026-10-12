import { supabase } from "../../config.js";
import {
  checkAchievements,
  saveGameResult,
} from "../../services/achievements.js";
import { bumpWeeklyChallenge } from "../../services/weeklyChallenge.js";
import { customRooms, dbRooms } from "../../state.js";
import { settleCards } from "./cardFlow.js";
import { getOrCreateRoom } from "./rooms.js";

// Elo à la manière des échecs, chaque paire de joueurs comptant comme un
// match. K baisse avec l'expérience : les nouveaux bougent plus vite.
async function computeEloChanges(rankedPlayers) {
  const registeredIds = rankedPlayers
    .filter((p) => p.userId && !p.isGuest)
    .map((p) => p.userId);
  if (registeredIds.length < 2) return {};

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, elo, games_played")
    .in("id", registeredIds);
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  const changes = {};
  for (const player of rankedPlayers) {
    const profile = player.isGuest ? null : profileMap[player.userId];
    if (!profile) continue;
    const k =
      profile.games_played < 30 ? 32 : profile.games_played < 100 ? 20 : 10;
    let change = 0;
    for (const opp of rankedPlayers) {
      if (opp.userId === player.userId) continue;
      const oppElo = (opp.isGuest ? null : profileMap[opp.userId])?.elo ?? 1000;
      const expected = 1 / (1 + Math.pow(10, (oppElo - profile.elo) / 400));
      change += k * ((player.rank < opp.rank ? 1 : 0) - expected);
    }
    changes[player.userId] = Math.round(change);
  }
  return changes;
}

export async function saveGameResults(roomId, finalScores, io) {
  const room = getOrCreateRoom(roomId);
  const dbGameId = room.game.dbGameId;
  // _ended : partie déjà persistée — rejouer elo, stats et succès la compterait deux fois
  // Cartes provisoires des joueurs encore là : elles deviennent définitives.
  // Idempotent : une carte déjà attribuée n'est plus en attente.
  for (const p of finalScores)
    if (p.userId && !p.isGuest)
      await settleCards({
        game: room.game,
        name: p.name,
        userId: p.userId,
        keep: true,
        io,
        socketId: room.nameToSocket[p.name],
      }).catch(() => {});

  if (!dbGameId || room.game._ended) return;

  try {
    await supabase
      .from("games")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", dbGameId);

    // Un joueur parti en cours de partie a déjà sa ligne (saveMidGamePlayer) :
    // le réinsérer doublerait son score dans les classements
    const players = finalScores
      .map((p, i) => ({
        game_id: dbGameId,
        user_id: p.userId || null,
        username: p.name,
        score: p.score,
        rank: i + 1,
        is_guest: p.isGuest || !p.userId,
      }))
      .filter((row) => !room.game.savedPlayers.has(row.username));
    if (players.length) await supabase.from("game_players").insert(players);
    finalScores.forEach((p) => room.game.savedPlayers.add(p.name));
    finalScores.forEach((p) => {
      if (p.userId && !p.isGuest)
        bumpWeeklyChallenge("games_played", p.userId, 1);
    });

    room.game._ended = true;
    const eloEligible =
      !!dbRooms[roomId]?.is_public &&
      finalScores.length >= 3 &&
      room.game_mode !== "qcm";
    const eloChanges = eloEligible
      ? await computeEloChanges(
          finalScores.map((p, i) => ({ ...p, rank: i + 1 })),
        )
      : {};

    if (room.game_mode !== "qcm") {
      for (let i = 0; i < finalScores.length; i++) {
        const p = finalScores[i];
        if (p.userId && !p.isGuest) {
          await supabase.rpc("update_player_stats", {
            p_user_id: p.userId,
            p_score: p.score,
            p_rank: i + 1,
            p_total_players: finalScores.length,
            p_elo_change: eloChanges[p.userId] ?? 0,
          });
        }
      }

      const roomMeta = dbRooms[roomId] || customRooms[roomId] || {};
      const totalRounds = room.game.currentRound;
      for (let i = 0; i < finalScores.length; i++) {
        const p = finalScores[i];
        if (!p.userId || p.isGuest) continue;
        const unlocks = await checkAchievements(p.userId, {
          score: p.score,
          rank: i + 1,
          totalPlayers: finalScores.length,
          correctRounds: room.players[p.name]?.roundsFullFound || 0,
          totalRounds,
        });
        const resultId = await saveGameResult({
          gameId: dbGameId,
          userId: p.userId,
          username: p.name,
          score: p.score,
          rank: i + 1,
          totalPlayers: finalScores.length,
          roomName: roomMeta.name || roomId,
          roomEmoji: roomMeta.emoji || null,
          achievementIds: unlocks.map((u) =>
            u.tier ? `${u.id}:${u.tier}` : u.id,
          ),
        });
        const sockId = room.nameToSocket[p.name];
        if (sockId) {
          if (unlocks.length)
            io.to(sockId).emit("achievements_unlocked", unlocks);
          if (resultId) io.to(sockId).emit("game_result_id", resultId);
        }
      }
    }
    console.log(`Game ${dbGameId} sauvegardee.`);
  } catch (err) {
    console.error("Erreur sauvegarde:", err.message, err.stack);
  }
}

export async function saveMidGamePlayer(
  dbGameId,
  player,
  gameMode,
  totalPlayers,
) {
  try {
    await supabase.from("game_players").insert({
      game_id: dbGameId,
      user_id: player.userId || null,
      username: player.name,
      score: player.score,
      rank: null,
      is_guest: player.isGuest || !player.userId,
    });
    if (player.userId && !player.isGuest && gameMode !== "qcm") {
      await supabase.rpc("update_player_stats", {
        p_user_id: player.userId,
        p_score: player.score,
        p_rank: null,
        p_total_players: totalPlayers,
        p_elo_change: 0,
      });
    }
    console.log(
      `Score mi-partie sauvegarde: ${player.name} — ${player.score} pts`,
    );
  } catch (e) {
    console.error("Erreur sauvegarde mi-partie:", e.message);
  }
}
