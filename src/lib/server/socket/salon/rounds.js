import { salonRooms } from "../../state.js";
import { displayString } from "../../services/playlist.js";
import { reportTrackIssue } from "../../services/trackIssues.js";
import { makeChoices, calcQcmPoints } from "../scoring.js";
import { recordSalonGameEnd } from "./persist.js";
import { searchTrackVideo } from "./tracks.js";
import { prefetchNextVideo, prepareSession } from "./session.js";
import { playerFullyFound, resetRoundFlags, standings } from "./players.js";
import { scheduleCleanup, startTimer, clearPause } from "./timers.js";

export function checkEveryoneDone(code, io) {
  const salon = salonRooms[code];
  if (!salon || salon.game.phase !== "round") return;
  // Only count connected players — disconnected ones can't answer
  const players = Object.values(salon.players).filter((p) => !p._disconnected);
  if (players.length === 0) return;
  // In QCM mode: done when everyone has answered (right or wrong)
  // In free mode: done when everyone has found all elements
  const allDone =
    salon.settings.answerMode === "multiple"
      ? players.every((p) => p._fullFoundCounted)
      : players.every((p) => playerFullyFound(p, salon.game.currentTrack));
  if (allDone) endRound(code, "Tout le monde a répondu !", io);
}

export function finishGame(code, io) {
  const salon = salonRooms[code];
  const game = salon.game;
  clearInterval(game.interval);
  game.interval = null;
  clearTimeout(game.breakTimer);
  game.breakTimer = null;
  clearTimeout(game.musicReadyTimer);
  game.musicReadyTimer = null;
  if (game.paused) clearPause(code, io);
  game.phase = "gameover";
  recordSalonGameEnd(salon);
  const scores = Object.values(salon.players)
    .map((p) => ({
      username: p.username,
      score: p.score,
      team: p.team,
      found: p.stats.found,
      first: p.stats.first,
    }))
    .sort((a, b) => b.score - a.score);
  io.to(`salon:${code}`).emit("salon_game_over", {
    scores,
    teams: standings(salon),
    history: game.history,
    rounds: game.history.length,
  });
  prepareSession(code, io);
  scheduleCleanup(code);
}

export function revealRound(code, reason, io) {
  clearPause(code, io);
  clearTimeout(salonRooms[code].game.musicReadyTimer);
  endRound(code, reason, io);
}

export function nextRound(code, io) {
  const game = salonRooms[code].game;
  clearPause(code, io);
  clearTimeout(game.breakTimer);
  game.breakTimer = null;
  startNextRound(code, io);
}

export function endRound(code, reason, io) {
  const salon = salonRooms[code];
  if (!salon) return;
  const game = salon.game;

  clearInterval(game.interval);
  game.interval = null;
  game.paused = false;
  game.phase = "summary";

  const track = game.currentTrack;
  const answer = `${displayString(track.mainArtist || track.artist)} - ${displayString(track.title)}`;

  // ── QCM deferred scoring: compute points and send individual feedback now ──
  if (salon.settings.answerMode === "multiple") {
    // Determine firstFinder: the correct player with the lowest timeTaken
    if (!game.firstFinder) {
      const firstCorrect = Object.values(salon.players)
        .filter(
          (p) =>
            p._fullFoundCounted &&
            p._choiceIndex === game.correctChoiceIndex &&
            !p._disconnected,
        )
        .sort(
          (a, b) =>
            (a._choiceTimeTaken ?? Infinity) - (b._choiceTimeTaken ?? Infinity),
        )[0];
      if (firstCorrect) game.firstFinder = firstCorrect.username;
    }

    for (const p of Object.values(salon.players)) {
      if (!p.socketId || p._disconnected) continue;
      if (p._fullFoundCounted) {
        // They answered — evaluate
        const correct = p._choiceIndex === game.correctChoiceIndex;
        if (correct) {
          const points = calcQcmPoints(
            p._choiceTimeTaken ?? salon.settings.roundDuration,
            salon.settings.roundDuration,
          );
          p.score += points;
          p.foundArtist = true;
          p.foundTitle = true;
          io.to(p.socketId).emit("salon_feedback", {
            type: "success_title",
            correct: true,
            points,
            msg: `Bonne réponse ! (+${points} pts)`,
          });
        } else {
          io.to(p.socketId).emit("salon_feedback", {
            type: "miss",
            correct: false,
            points: 0,
            msg: "Raté !",
          });
        }
      } else {
        // Didn't answer in time
        io.to(p.socketId).emit("salon_feedback", {
          type: "miss",
          correct: false,
          points: 0,
          msg: "Temps écoulé…",
        });
      }
    }
  }

  for (const p of Object.values(salon.players)) {
    const ok =
      salon.settings.answerMode === "multiple"
        ? p._fullFoundCounted && p._choiceIndex === game.correctChoiceIndex
        : p._fullFoundCounted;
    if (ok) p.stats.found++;
  }
  if (game.firstFinder && salon.players[game.firstFinder])
    salon.players[game.firstFinder].stats.first++;

  const scores = Object.values(salon.players)
    .map((p) => ({
      username: p.username,
      score: p.score,
      team: p.team,
      delta: p.score - (p.scoreBeforeRound ?? 0),
    }))
    .sort((a, b) => b.score - a.score);

  const roundSummary = {
    answer,
    cover: track.cover,
    reason,
    firstFinder: game.firstFinder,
    featArtists: (track.featArtists || []).map(displayString),
    scores,
    teams: standings(salon),
    correctChoiceIndex:
      salon.settings.answerMode === "multiple"
        ? game.correctChoiceIndex
        : undefined,
  };

  game.history.push({ answer, cover: track.cover });
  io.to(`salon:${code}`).emit("salon_round_end", roundSummary);
  scheduleCleanup(code);

  if (!salon.settings.manualNext) {
    game.breakTimer = setTimeout(() => {
      game.breakTimer = null;
      startNextRound(code, io);
    }, salon.settings.showAnswerDuration * 1000);
  }
}

export async function startNextRound(code, io) {
  const salon = salonRooms[code];
  if (!salon) return;
  const game = salon.game;

  if (
    game.currentRound >= salon.settings.maxRounds ||
    game.sessionPlaylist.length === 0
  ) {
    finishGame(code, io);
    return;
  }

  game.currentRound++;
  game.firstFinder = null;
  resetRoundFlags(salon);
  game.currentTrack = game.sessionPlaylist.pop();
  game.played.push(game.currentTrack);
  game.choices = null;
  game.correctChoiceIndex = null;

  const track = game.currentTrack;

  try {
    let video, safeStart;
    if (game.prefetchedRound?.track === track) {
      ({ video, safeStart } = game.prefetchedRound);
      game.prefetchedRound = null;
    }
    if (!video && game._prefetchPromise) {
      await game._prefetchPromise.catch(() => {});
      game._prefetchPromise = null;
      if (game.prefetchedRound?.track === track) {
        ({ video, safeStart } = game.prefetchedRound);
        game.prefetchedRound = null;
      }
    }
    if (!video) {
      ({ video, safeStart } = await searchTrackVideo(
        track,
        salon.settings.roundDuration,
      ));
    }

    game.currentVideo = { id: video.id, start: safeStart };
    game.phase = "round";
    game.timerActive = false;
    game.timerValue = 0;
    game.startTime = 0;

    let choices = undefined;
    if (salon.settings.answerMode === "multiple") {
      const { choices: c, correctChoiceIndex: idx } = makeChoices(
        track,
        game.fullPlaylist,
        " - ",
      );
      game.choices = c;
      game.correctChoiceIndex = idx;
      choices = c;
    }

    const roundData = {
      videoId: video.id,
      startSeconds: safeStart,
      round: game.currentRound,
      total: salon.settings.maxRounds,
      choices,
      featCount: track.featArtists?.length || 0,
      extras: (track.extraAnswers || []).map((e) => ({ label: e.label })),
    };

    // La réponse ne part qu'à la régie : l'écran TV est public, n'importe
    // qui avec le code peut l'ouvrir
    io.to(`salon:screens:${code}`).emit("salon_round_start", roundData);
    io.to(`salon:ctrl:${code}`).emit("salon_round_start", {
      ...roundData,
      hostInfo: currentTrackInfo(salon),
    });
    // Send to players (no answer info)
    io.to(`salon:players:${code}`).emit("salon_round_start", roundData);

    // L'hôte signale le début de la musique ; filet si son lecteur ne répond
    // pas. Large : sur une connexion lente, la vidéo met du temps à démarrer.
    game.musicReadyTimer = setTimeout(() => startTimer(code, io), 12000);

    prefetchNextVideo(code, io);
  } catch (err) {
    console.error(`Salon skip "${track.title}":`, err.message);
    reportTrackIssue(
      track.id,
      "video",
      "auto",
      "Aucune vidéo trouvée en salon",
      {
        salon: code,
      },
    );
    // Titre sans source : on ne consomme pas la manche, on passe au titre suivant
    game.currentRound--;
    startNextRound(code, io);
  }
}

export function currentTrackInfo(salon) {
  const track = salon.game.currentTrack;
  if (!track) return null;
  return {
    artist: displayString(track.mainArtist || track.artist),
    title: displayString(track.title),
    cover: track.cover,
    correctChoiceIndex: salon.game.correctChoiceIndex,
  };
}
