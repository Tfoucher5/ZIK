import {
  calcSpeedBonus,
  cleanString,
  displayString,
} from "../../services/playlist.js";
import { bumpWeeklyChallenge } from "../../services/weeklyChallenge.js";
import { calcQcmPoints, checkClose, checkMatch } from "../scoring.js";
import { emitPlayers, getOrCreateRoom } from "./rooms.js";
import { checkEveryoneFound } from "./rounds.js";

// Réponses des joueurs : texte libre ou QCM
export function registerAnswers(socket, io) {
  socket.on("submit_guess", async (guess) => {
    const roomId = socket.currentRoom;
    if (!roomId) return;
    const room = getOrCreateRoom(roomId);
    const name = room.socketToName[socket.id];

    if (!room.game.isActive || !room.game.currentTrack || !room.players[name])
      return;
    if (!guess?.trim()) return;

    const user = room.players[name];

    // Au plus 4 réponses par seconde : invisible pour un humain, coupe les scripts
    const now = Date.now();
    user._guessTimes = (user._guessTimes || []).filter((t) => now - t < 1000);
    if (user._guessTimes.length >= 4) return;
    user._guessTimes.push(now);
    user.guessesThisRound = (user.guessesThisRound || 0) + 1;
    user.lastAnswerRound = room.game.currentRound;

    const input = cleanString(guess);
    const timeTaken = (Date.now() - room.game.startTime) / 1000;
    const speedBonus = calcSpeedBonus(timeTaken);
    const track = room.game.currentTrack;
    const cover = track.cover || "";

    let hit = false;

    if (!user.foundArtist) {
      if (checkMatch(input, track.cleanArtist)) {
        user.foundArtist = true;
        user.score += 1 + speedBonus;
        socket.emit("feedback", {
          type: "success_artist",
          msg: `Artiste ! (+${1 + speedBonus} pts)`,
          val: displayString(track.mainArtist || track.artist),
          cover,
        });
        hit = true;
      } else if (!hit && checkClose(input, track.cleanArtist)) {
        socket.emit("feedback", {
          type: "close",
          msg: "Tu chauffes sur l'artiste !",
        });
        hit = true;
      }
    }

    for (let fi = 0; fi < track.cleanFeatArtists.length; fi++) {
      if (user.foundFeats[fi]) continue;
      const cleanFeat = track.cleanFeatArtists[fi];
      if (checkMatch(input, cleanFeat)) {
        user.foundFeats[fi] = true;
        user.score += 1 + speedBonus;
        socket.emit("feedback", {
          type: "success_feat",
          featIndex: fi,
          msg: `Feat ! (+${1 + speedBonus} pts)`,
          val: displayString(track.featArtists[fi]),
          cover,
        });
        hit = true;
        break;
      } else if (!hit && checkClose(input, cleanFeat)) {
        socket.emit("feedback", {
          type: "close",
          msg: "Tu chauffes sur le feat !",
        });
        hit = true;
      }
    }

    if (!user.foundTitle) {
      if (checkMatch(input, track.cleanTitle)) {
        user.foundTitle = true;
        user.score += 1 + speedBonus;
        socket.emit("feedback", {
          type: "success_title",
          msg: `Titre ! (+${1 + speedBonus} pts)`,
          val: displayString(track.title),
          cover,
        });
        hit = true;
      } else if (!hit && checkClose(input, track.cleanTitle)) {
        socket.emit("feedback", {
          type: "close",
          msg: "Tu chauffes sur le titre !",
        });
        hit = true;
      }
    }

    if (!hit) {
      for (let ei = 0; ei < (track.extraAnswers || []).length; ei++) {
        if (user.foundExtras[ei]) continue;
        const extra = track.extraAnswers[ei];
        if (checkMatch(input, extra.clean)) {
          user.foundExtras[ei] = true;
          user.score += 1 + speedBonus;
          socket.emit("feedback", {
            type: "success_extra",
            extraIndex: ei,
            msg: `${extra.label} ! (+${1 + speedBonus} pts)`,
            val: extra.value,
            cover,
          });
          hit = true;
          break;
        } else if (checkClose(input, extra.clean)) {
          socket.emit("feedback", {
            type: "close",
            msg: `Tu chauffes sur ${extra.label} !`,
          });
          hit = true;
          break;
        }
      }
    }

    if (!hit) socket.emit("feedback", { type: "miss", msg: "Pas du tout..." });

    emitPlayers(room, io);

    const allMainFound =
      user.foundArtist &&
      user.foundTitle &&
      track.cleanFeatArtists.every((_, i) => user.foundFeats[i]) &&
      (track.extraAnswers || []).every((_, i) => user.foundExtras[i]);
    if (allMainFound && !user._fullFoundCounted) {
      user._fullFoundCounted = true;
      user.roundsFullFound = (user.roundsFullFound || 0) + 1;
      if (!room.game.firstFullFinder) room.game.firstFullFinder = user.name;
      room.game.fullFinders.push({ name: user.name, ms: timeTaken * 1000 });
      room.game.totalFullFound++;
      if (user.userId && !user.isGuest)
        bumpWeeklyChallenge("correct_answers", user.userId, 1);
      socket.emit("reveal_cover", { cover: room.game.currentTrack.cover });
    }

    checkEveryoneFound(roomId, io);
  });

  socket.on("submit_choice", ({ choiceIndex }) => {
    const roomId = socket.currentRoom;
    if (!roomId) return;
    const room = getOrCreateRoom(roomId);
    const name = room.socketToName[socket.id];
    if (!room.game.isActive || !room.game.currentTrack || !room.players[name])
      return;
    if (room.game_mode !== "qcm") return;

    const user = room.players[name];
    if (user._qcmAnswered) return;

    user._qcmAnswered = true;
    user.lastAnswerRound = room.game.currentRound;
    const isCorrect = choiceIndex === room.game.correctChoiceIndex;
    const timeTaken = (Date.now() - room.game.startTime) / 1000;
    let pts = 0;

    if (isCorrect) {
      pts = calcQcmPoints(timeTaken, room.game.roundDuration);
      user.score += pts;
      user.foundArtist = true;
      user.foundTitle = true;
      user._fullFoundCounted = true;
      if (!room.game.firstFullFinder) room.game.firstFullFinder = user.name;
      room.game.fullFinders.push({ name: user.name, ms: timeTaken * 1000 });
      room.game.totalFullFound++;
      if (user.userId && !user.isGuest)
        bumpWeeklyChallenge("correct_answers", user.userId, 1);
      socket.emit("feedback", {
        type: "qcm_correct",
        msg: `Bonne réponse ! +${pts} pts`,
      });
      socket.emit("reveal_cover", { cover: room.game.currentTrack.cover });
    } else {
      socket.emit("feedback", { type: "qcm_wrong", msg: "Raté !" });
    }
    socket.emit("choice_result", { correct: isCorrect, pts });

    emitPlayers(room, io);
    const activePlayers = Object.values(room.players).filter(
      (p) => !p._disconnected,
    );
    io.to(`room:${roomId}`).emit("qcm_answered_update", {
      answered: activePlayers.filter((p) => p._qcmAnswered).length,
      total: activePlayers.length,
    });
    checkEveryoneFound(roomId, io);
  });
}
