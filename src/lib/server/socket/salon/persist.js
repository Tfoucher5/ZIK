import { getAdminClient } from "../../config.js";
import { gamePlayers } from "./departed.js";

// Une partie salon n'a pas de ligne game_players : les invités n'ont pas de
// compte et le salon ne doit pas compter dans les classements. La partie, son
// nombre de joueurs et leurs scores (salon_players, pour l'admin) sont gardés.

export async function recordSalonGameStart(salon) {
  salon.game.dbGameId = null;
  try {
    const { data } = await getAdminClient()
      .schema("play")
      .from("games")
      .insert({
        room_id: salon.code,
        rounds: salon.settings.maxRounds,
        mode: salon.settings.answerMode === "multiple" ? "qcm" : "classic",
        source: "salon",
        origin: salon.origin,
        host_id: salon.hostUserId,
      })
      .select("id")
      .single();
    if (data) salon.game.dbGameId = data.id;
  } catch {
    /* non bloquant */
  }
}

function recordSalonPlayers(gameId, salon) {
  const teamName = (id) =>
    salon.settings.teams?.find((t) => t.id === id)?.name ?? null;
  const rows = gamePlayers(salon)
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({
      game_id: gameId,
      user_id: p.userId ?? null,
      username: p.username,
      score: p.score,
      rank: i + 1,
      team: teamName(p.team),
      departed: Boolean(p.left),
    }));
  if (!rows.length) return;
  getAdminClient()
    .schema("salon")
    .from("salon_players")
    .insert(rows)
    .then(({ error }) => {
      if (error) console.error("[salon] joueurs de la partie:", error.message);
    });
}

export function recordSalonGameEnd(salon) {
  const id = salon.game.dbGameId;
  if (!id) return;
  salon.game.dbGameId = null;
  recordSalonPlayers(id, salon);
  const limitHits = salon.limitHits ?? 0;
  salon.limitHits = 0;
  getAdminClient()
    .schema("play")
    .from("games")
    .update({
      ended_at: new Date().toISOString(),
      player_count: gamePlayers(salon).length,
      limit_hits: limitHits,
    })
    .eq("id", id)
    .then(({ error }) => {
      if (error) console.error("[salon] fin de partie:", error.message);
    });
}
