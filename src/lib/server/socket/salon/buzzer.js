import { salonRooms } from "../../state.js";
import { calcQcmPoints } from "../scoring.js";
import { adminSalon, broadcastScores } from "./players.js";
import { endRound } from "./rounds.js";
import { roundMult } from "./specials.js";
import { clearPause, pauseGame, resumeGame } from "./timers.js";

// Mode buzzer (ZIK Pro) : le premier qui buzze coupe la musique, répond à
// voix haute, et l'animateur valide ou non depuis la régie
export function registerBuzzer(socket, io) {
  socket.on("salon_buzz", () => {
    const salon = salonRooms[socket.salonCode];
    const game = salon?.game;
    const player = salon?.players[socket.salonUsername];
    if (!player || salon.settings.answerMode !== "buzzer") return;
    if (game.phase !== "round" || !game.timerActive || game.paused) return;
    if (game.buzzer || player._buzzLocked) return;

    game.buzzer = {
      username: player.username,
      at: (Date.now() - game.startTime) / 1000,
    };
    io.to(`salon:${salon.code}`).emit("salon_buzzed", {
      username: player.username,
      team: player.team,
    });
    pauseGame(salon.code, io);
  });

  socket.on("salon_buzz_judge", ({ correct } = {}) => {
    const salon = adminSalon(socket);
    const game = salon?.game;
    if (!game?.buzzer || game.phase !== "round") return;
    const { code } = salon;
    const { username, at } = game.buzzer;
    const player = salon.players[username];
    game.buzzer = null;
    io.to(`salon:${code}`).emit("salon_buzz_result", {
      username,
      correct: !!correct,
    });

    if (correct && player) {
      const points =
        calcQcmPoints(at, game.timerMax ?? salon.settings.roundDuration) *
        roundMult(game);
      player.score += points;
      player.foundArtist = true;
      player.foundTitle = true;
      player._fullFoundCounted = true;
      game.firstFinder = username;
      if (player.socketId)
        io.to(player.socketId).emit("salon_feedback", {
          type: "success_title",
          correct: true,
          points,
          msg: `Bonne réponse ! (+${points} pts)`,
        });
      clearPause(code, io);
      broadcastScores(code, io);
      endRound(code, `${username} a trouvé !`, io);
      return;
    }

    if (player) {
      player._buzzLocked = true;
      if (player.socketId)
        io.to(player.socketId).emit("salon_feedback", {
          type: "miss",
          correct: false,
          points: 0,
          msg: "Raté ! Plus de buzz pour toi sur cette manche.",
        });
    }
    const left = Object.values(salon.players).filter(
      (p) => !p._disconnected && !p._buzzLocked,
    );
    if (left.length) return resumeGame(code, io);
    clearPause(code, io);
    endRound(code, "Personne n'a trouvé", io);
  });
}
