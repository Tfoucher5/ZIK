import { calcSpeedBonus } from "../../services/music/playlist.js";
import { cleanString } from "../../services/music/trackText.js";
import { salonRooms } from "../../state.js";
import { closeMsg, gradeGuess, markFound, partName } from "../scoring.js";
import {
  broadcastRoster,
  playerFullyFound,
  sortedScores,
  staff,
  standings,
} from "./players.js";
import { checkEveryoneDone } from "./rounds.js";
// Téléphones des joueurs : équipe et réponses
export function registerAnswers(socket, io) {
  // Le joueur choisit son équipe avant la partie, pas en cours de route
  socket.on("salon_pick_team", ({ team } = {}) => {
    const salon = salonRooms[socket.salonCode];
    const player = salon?.players[socket.salonUsername];
    if (!player || !salon.settings.teams?.some((t) => t.id === team)) return;
    if (salon.game.phase !== "lobby" && salon.game.phase !== "gameover") return;
    player.team = team;
    broadcastRoster(salon.code, io);
  });

  // ── Player submits free text answer ──────────────────────────────────────
  socket.on("salon_submit_guess", ({ guess }) => {
    const code = socket.salonCode;
    const username = socket.salonUsername;
    const salon = salonRooms[code];
    // Pas de réponse avant que la musique joue (chrono lancé)
    if (
      !salon ||
      salon.game.phase !== "round" ||
      salon.game.paused ||
      !salon.game.timerActive
    )
      return;

    const player = salon.players[username];
    if (!player || player._fullFoundCounted) return;
    if (Date.now() - player._lastGuessAt < 300) return;
    player._lastGuessAt = Date.now();

    const track = salon.game.currentTrack;
    const input = cleanString(guess?.slice(0, 100) || "");
    if (!input) return;

    const timeTaken = (Date.now() - salon.game.startTime) / 1000;
    const bonus = calcSpeedBonus(timeTaken);
    const { hits, close } = gradeGuess(input, track, player);
    for (const part of hits) {
      markFound(player, part);
      player.score += 1 + bonus;
      socket.emit("salon_feedback", {
        type: `success_${part.kind}`,
        extraIndex: part.kind === "extra" ? part.index : undefined,
        correct: true,
        points: 1 + bonus,
        msg: `${partName(part, track)} ! (+${1 + bonus} pts)`,
      });
    }
    if (!hits.length)
      socket.emit("salon_feedback", {
        type: close ? "close" : "miss",
        correct: false,
        points: 0,
        msg: close ? closeMsg(close, track) : "Pas du tout…",
      });
    const hit = hits.length > 0 || !!close;

    // Check if fully found now
    if (playerFullyFound(player, track) && !player._fullFoundCounted) {
      player._fullFoundCounted = true;
      if (!salon.game.firstFinder) salon.game.firstFinder = username;
    }

    // Notify host on every hit with full found state
    if (hit) {
      staff(code, io).emit("salon_player_answered", {
        username,
        correct: player._fullFoundCounted,
        foundArtist: player.foundArtist,
        foundTitle: player.foundTitle,
        foundFeatCount: player.foundFeats.filter(Boolean).length,
        totalFeatCount: track.cleanFeatArtists?.length || 0,
      });
    }

    // Broadcast updated scores
    io.to(`salon:${code}`).emit("salon_scores_update", {
      scores: sortedScores(salon),
      teams: standings(salon),
    });

    checkEveryoneDone(code, io);
  });

  // ── Player submits multiple choice ────────────────────────────────────────
  socket.on("salon_submit_choice", ({ choiceIndex }) => {
    const code = socket.salonCode;
    const username = socket.salonUsername;
    const salon = salonRooms[code];
    // Pas de réponse avant que la musique joue (chrono lancé)
    if (
      !salon ||
      salon.game.phase !== "round" ||
      salon.game.paused ||
      !salon.game.timerActive
    )
      return;

    const player = salon.players[username];
    if (!player || player._fullFoundCounted) return;

    const game = salon.game;
    const timeTaken = (Date.now() - game.startTime) / 1000;

    // Store choice for deferred scoring at round end (Kahoot-style suspense)
    player._choiceIndex = choiceIndex;
    player._choiceTimeTaken = timeTaken;
    player._fullFoundCounted = true; // block re-submission

    // Notify host that player has answered — but NOT whether it's correct
    staff(code, io).emit("salon_player_answered", {
      username,
      answered: true,
      // foundArtist/foundTitle intentionally omitted — reveal at round end
      totalFeatCount: game.currentTrack?.cleanFeatArtists?.length || 0,
    });

    // Scores are NOT updated here — deferred to endRound
    checkEveryoneDone(code, io);
  });
}
