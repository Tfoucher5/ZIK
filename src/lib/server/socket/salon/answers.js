import { calcSpeedBonus } from "../../services/music/playlist.js";
import { cleanString } from "../../services/music/trackText.js";
import { salonRooms } from "../../state.js";
import {
  calcQcmPoints,
  closeMsg,
  gradeGuess,
  markFound,
  partName,
} from "../scoring.js";
import {
  broadcastRoster,
  broadcastScores,
  playerFullyFound,
  staff,
} from "./players.js";
import { checkEveryoneDone } from "./rounds.js";
import { gamePlayers } from "./departed.js";
import { roundMult } from "./specials.js";
import { int, safe, str } from "../safe.js";
// Téléphones des joueurs : équipe et réponses
export function registerAnswers(socket, io) {
  // Le joueur choisit son équipe avant la partie, pas en cours de route
  safe(socket, "salon_pick_team", { team: int(0, 99) }, ({ team }) => {
    const salon = salonRooms[socket.salonCode];
    const player = salon?.players[socket.salonUsername];
    if (!player || !salon.settings.teams?.some((t) => t.id === team)) return;
    if (salon.game.phase !== "lobby" && salon.game.phase !== "gameover") return;
    player.team = team;
    broadcastRoster(salon.code, io);
  });

  // ── Player submits free text answer ──────────────────────────────────────
  safe(socket, "salon_submit_guess", { guess: str(200) }, ({ guess }) => {
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
    const pts = (1 + bonus) * roundMult(salon.game);
    const { hits, close } = gradeGuess(input, track, player);
    for (const part of hits) {
      markFound(player, part);
      player.score += pts;
      socket.emit("salon_feedback", {
        type: `success_${part.kind}`,
        extraIndex: part.kind === "extra" ? part.index : undefined,
        correct: true,
        points: pts,
        msg: `${partName(part, track)} ! (+${pts} pts)`,
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

    if (hits.length) broadcastScores(code, io);

    checkEveryoneDone(code, io);
  });

  // ── Player submits multiple choice ────────────────────────────────────────
  safe(
    socket,
    "salon_submit_choice",
    { choiceIndex: int(0, 9) },
    // Accusé : la case retenue par le serveur, null si la réponse est refusée
    ({ choiceIndex }, ack) => {
      const code = socket.salonCode;
      const username = socket.salonUsername;
      const salon = salonRooms[code];
      // Pas de réponse avant que la musique joue (chrono lancé)
      if (
        !salon ||
        salon.game.phase !== "round" ||
        salon.game.paused ||
        !salon.game.timerActive ||
        choiceIndex >= (salon.game.choices?.length ?? 0)
      )
        return ack(null);

      const player = salon.players[username];
      if (!player) return ack(null);
      // Renvoi après un accusé perdu : la première réponse reste
      if (player._fullFoundCounted) return ack(player._choiceIndex ?? null);

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

      ack(choiceIndex);
      // Scores are NOT updated here — deferred to endRound
      checkEveryoneDone(code, io);
    },
  );
}

// QCM : les points ne tombent qu'à la fin de la manche, avec le retour de chacun
export function scoreQcmRound(salon, io) {
  const game = salon.game;
  // Premier à trouver : la bonne réponse la plus rapide
  if (!game.firstFinder) {
    const firstCorrect = gamePlayers(salon)
      .filter(
        (p) =>
          p._fullFoundCounted && p._choiceIndex === game.correctChoiceIndex,
      )
      .sort(
        (a, b) =>
          (a._choiceTimeTaken ?? Infinity) - (b._choiceTimeTaken ?? Infinity),
      )[0];
    if (firstCorrect) game.firstFinder = firstCorrect.username;
  }

  // Partis compris : leur réponse donnée avant le départ compte
  for (const p of gamePlayers(salon)) {
    const correct =
      p._fullFoundCounted && p._choiceIndex === game.correctChoiceIndex;
    let points = 0;
    // Réseau coupé après avoir répondu : la réponse enregistrée compte quand même
    if (correct) {
      const max = game.timerMax ?? salon.settings.roundDuration;
      points = calcQcmPoints(p._choiceTimeTaken ?? max, max) * roundMult(game);
      p.score += points;
      p.foundArtist = true;
      p.foundTitle = true;
    }
    if (!p.socketId) continue;
    io.to(p.socketId).emit(
      "salon_feedback",
      correct
        ? {
            type: "success_title",
            correct: true,
            points,
            msg: `Bonne réponse ! (+${points} pts)`,
          }
        : {
            type: "miss",
            correct: false,
            points: 0,
            msg: p._fullFoundCounted ? "Raté !" : "Temps écoulé…",
          },
    );
  }
}
