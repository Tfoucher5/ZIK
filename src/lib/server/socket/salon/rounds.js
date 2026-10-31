import { salonRooms } from "../../state.js";
import { displayString } from "../../services/music/trackText.js";
import { reportTrackIssue } from "../../services/music/trackIssues.js";
import { makeChoices } from "../scoring.js";
import { recordSalonGameEnd } from "./persist.js";
import { scoreQcmRound } from "./answers.js";
import { drawSpecial } from "./specials.js";
import { SPECIAL_INTRO_MS } from "../../../data/salonOptions.js";
import { OUTAGE_AFTER, holdForVideos, clearOutage } from "./outage.js";
import { currentTrackInfo } from "./tracks.js";
import { resolveMedia } from "./media.js";
import {
  drawSpareTrack,
  prefetchNextVideo,
  prepareSession,
} from "./session.js";
import {
  nightView,
  playerFullyFound,
  resetRoundFlags,
  standings,
} from "./players.js";
import { scheduleCleanup, startTimer, clearPause } from "./timers.js";

export function checkEveryoneDone(code, io) {
  const salon = salonRooms[code];
  if (!salon || salon.game.phase !== "round") return;
  // Only count connected players — disconnected ones can't answer
  const players = Object.values(salon.players).filter((p) => !p._disconnected);
  if (players.length === 0) return;
  // In QCM mode: done when everyone has answered (right or wrong)
  // In free mode: done when everyone has found all elements
  const mode = salon.settings.answerMode;
  const allDone =
    mode === "buzzer"
      ? players.every((p) => p._buzzLocked)
      : mode === "multiple"
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
  game.gen = (game.gen ?? 0) + 1;
  clearOutage(salon, io);
  recordSalonGameEnd(salon);
  for (const p of Object.values(salon.players)) p.night += p.score;
  salon.nightGames = (salon.nightGames ?? 0) + 1;
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
    night: nightView(salon),
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
  game.buzzer = null;
  game.phase = "summary";

  const track = game.currentTrack;
  const answer = `${displayString(track.mainArtist || track.artist)} - ${displayString(track.title)}`;

  if (salon.settings.answerMode === "multiple") scoreQcmRound(salon, io);

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
  game.buzzer = null;
  game.special = drawSpecial(salon);
  resetRoundFlags(salon);
  game.currentTrack = game.sessionPlaylist.pop();
  game.played.push(game.currentTrack);
  game.choices = null;
  game.correctChoiceIndex = null;

  const track = game.currentTrack;
  const gen = game.gen;

  try {
    const { video, audio, safeStart } = await resolveMedia(salon, track);
    // Relance, partie terminée ou salon fermé pendant la recherche : manche périmée
    if (
      salonRooms[code] !== salon ||
      game.currentTrack !== track ||
      game.gen !== gen
    )
      return;
    // Sans vidéo, la TV joue l'extrait audio : la manche a lieu quand même
    game.currentVideo = {
      id: video?.id ?? audio,
      start: safeStart,
      audio: !!audio,
    };
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
      videoId: video?.id,
      audioUrl: audio,
      startSeconds: safeStart,
      round: game.currentRound,
      total: salon.settings.maxRounds,
      choices,
      special: game.special,
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
    game.musicReadyTimer = setTimeout(
      () => startTimer(code, io),
      game.special ? SPECIAL_INTRO_MS + 12000 : 12000,
    );

    prefetchNextVideo(code, io);
  } catch (err) {
    if (salonRooms[code] !== salon || game.currentTrack !== track) return;
    console.error(`Salon skip "${track.title}":`, err.message);
    // En panne, les titres ne sont pas en cause : pas de faux signalements
    if (!game.videoOutage)
      reportTrackIssue(
        track.id,
        "video",
        "auto",
        "Aucune vidéo trouvée en salon",
        {
          salon: code,
        },
      );
    skipTrack(code, io);
  }
}

// Titre injouable : manche non consommée, un titre de réserve le remplace
export function skipTrack(code, io) {
  const salon = salonRooms[code];
  const game = salon.game;
  clearTimeout(game.musicReadyTimer);
  game.currentRound--;
  game.skipStreak = (game.skipStreak ?? 0) + 1;
  if (game.skipStreak >= OUTAGE_AFTER)
    return holdForVideos(salon, io, () => startNextRound(code, io));
  drawSpareTrack(game, game.currentTrack);
  startNextRound(code, io);
}
