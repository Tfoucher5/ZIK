import { calcSpeedBonus, cleanString } from "../../services/playlist.js";
import { salonRooms } from "../../state.js";
import { checkClose, checkMatch } from "../scoring.js";
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
    let hit = false;

    if (!player.foundArtist) {
      if (checkMatch(input, track.cleanArtist)) {
        player.foundArtist = true;
        player.score += 1 + bonus;
        socket.emit("salon_feedback", {
          type: "success_artist",
          correct: true,
          points: 1 + bonus,
          msg: `Artiste ! (+${1 + bonus} pts)`,
        });
        hit = true;
      } else if (checkClose(input, track.cleanArtist)) {
        socket.emit("salon_feedback", {
          type: "close",
          correct: false,
          points: 0,
          msg: "Tu chauffes sur l'artiste !",
        });
        hit = true;
      }
    }

    if (!hit) {
      for (let fi = 0; fi < track.cleanFeatArtists.length; fi++) {
        if (player.foundFeats[fi]) continue;
        if (checkMatch(input, track.cleanFeatArtists[fi])) {
          player.foundFeats[fi] = true;
          player.score += 1 + bonus;
          socket.emit("salon_feedback", {
            type: "success_feat",
            correct: true,
            points: 1 + bonus,
            msg: `Feat ! (+${1 + bonus} pts)`,
          });
          hit = true;
          break;
        } else if (checkClose(input, track.cleanFeatArtists[fi])) {
          socket.emit("salon_feedback", {
            type: "close",
            correct: false,
            points: 0,
            msg: "Tu chauffes sur le feat !",
          });
          hit = true;
          break;
        }
      }
    }

    if (!hit) {
      if (!player.foundTitle) {
        if (checkMatch(input, track.cleanTitle)) {
          player.foundTitle = true;
          player.score += 1 + bonus;
          socket.emit("salon_feedback", {
            type: "success_title",
            correct: true,
            points: 1 + bonus,
            msg: `Titre ! (+${1 + bonus} pts)`,
          });
          hit = true;
        } else if (checkClose(input, track.cleanTitle)) {
          socket.emit("salon_feedback", {
            type: "close",
            correct: false,
            points: 0,
            msg: "Tu chauffes sur le titre !",
          });
          hit = true;
        }
      }
    }

    if (!hit) {
      for (let ei = 0; ei < (track.extraAnswers || []).length; ei++) {
        if (player.foundExtras[ei]) continue;
        const extra = track.extraAnswers[ei];
        if (checkMatch(input, extra.clean)) {
          player.foundExtras[ei] = true;
          player.score += 1 + bonus;
          socket.emit("salon_feedback", {
            type: "success_extra",
            extraIndex: ei,
            correct: true,
            points: 1 + bonus,
            msg: `${extra.label} ! (+${1 + bonus} pts)`,
          });
          hit = true;
          break;
        } else if (checkClose(input, extra.clean)) {
          socket.emit("salon_feedback", {
            type: "close",
            correct: false,
            points: 0,
            msg: `Tu chauffes sur ${extra.label} !`,
          });
          hit = true;
          break;
        }
      }
    }

    if (!hit) {
      socket.emit("salon_feedback", {
        type: "miss",
        correct: false,
        points: 0,
        msg: "Pas du tout…",
      });
    }

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
