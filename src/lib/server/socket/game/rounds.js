import { displayString } from "../../services/music/trackText.js";
import { reportTrackIssue } from "../../services/music/trackIssues.js";
import { roomGames } from "../../state.js";
import { audioUrlFor } from "../../audio/ytdlCache.js";
import { makeChoices } from "../scoring.js";
import { getPreview, prefetchNextRound } from "./audio.js";
import { cardsOffReason, onRoundEnd } from "./cardFlow.js";
import { saveGameResults } from "./results.js";
import { getOrCreateRoom, resetRoundFlags, sanitizePlayer } from "./rooms.js";

export function checkEveryoneFound(roomId, io) {
  const room = getOrCreateRoom(roomId);
  const activePlayers = Object.values(room.players);
  if (activePlayers.length === 0 || !room.game.isActive) return;

  if (room.game_mode === "qcm") {
    if (activePlayers.every((p) => p._qcmAnswered)) {
      endRound(roomId, "Tout le monde a répondu !", io);
    }
    return;
  }

  const track = room.game.currentTrack;
  const allDone = (p) => {
    const allFeats = (track?.cleanFeatArtists || []).every(
      (_, i) => p.foundFeats[i],
    );
    const allExtras = (track?.extraAnswers || []).every(
      (_, i) => p.foundExtras[i],
    );
    return p.foundArtist && p.foundTitle && allFeats && allExtras;
  };
  if (activePlayers.every(allDone)) {
    endRound(roomId, "Tout le monde a trouvé !", io);
  }
}

export function endRound(roomId, reason, io) {
  const room = getOrCreateRoom(roomId);
  const game = room.game;
  clearInterval(game.interval);
  // Une pause à l'entracte doit voir l'entracte, pas une manche en cours
  game.interval = null;
  game.isActive = false;

  const track = game.currentTrack;

  const summary = {
    answer: `${displayString(track.mainArtist || track.artist)} - ${displayString(track.title)}`,
    cover: track.cover,
    reason,
    firstFinder: game.firstFullFinder,
    totalFound: game.totalFullFound,
    round: game.currentRound,
    trackId: track.id ?? null,
    featArtists: (track.featArtists || []).map(displayString),
    extraAnswers: (track.extraAnswers || []).map((e) => ({
      label: e.label,
      value: e.value,
    })),
  };
  game.history.push(summary);

  const skipped = !!game._skipped;
  game._skipped = false;
  const cards = onRoundEnd(room, track, { skipped });

  Object.keys(room.players).forEach((username) => {
    const p = room.players[username];
    const socketId = room.nameToSocket[username];
    if (socketId) {
      io.to(socketId).emit("round_end", {
        ...summary,
        foundArtist: p.foundArtist,
        foundTitle: p.foundTitle,
        foundFeats: p.foundFeats || [],
        foundExtras: p.foundExtras || [],
        card: cards[username] ?? null,
        correctChoiceIndex:
          room.game_mode === "qcm" ? game.correctChoiceIndex : undefined,
      });
    }
  });

  game.breakTimer = setTimeout(() => {
    game.breakTimer = null;
    startNextRound(roomId, io);
  }, game.breakDuration * 1000);
}

export function announceRound(room, io) {
  const { game, roomId } = room;
  game._roundHeld = false;
  game.isSyncWaiting = true;
  game.readyPlayers = new Set();
  game.readyRound = game.currentRound;

  io.to(`room:${roomId}`).emit("start_round", game.lastRoundData);

  const activePlayers = Object.values(room.players).filter(
    (p) => !p._dcTimer,
  ).length;
  game.readyThreshold = Math.max(1, Math.round(activePlayers * 0.75));
  game.readyTimer = setTimeout(() => triggerRoundStart(roomId, io), 6000);
}

export function startTimer(roomId, io) {
  const room = getOrCreateRoom(roomId);
  const game = room.game;
  clearInterval(game.interval);
  game.interval = setInterval(() => {
    game.timer--;
    io.to(`room:${roomId}`).emit("timer_update", {
      current: game.timer,
      max: game.roundDuration,
    });
    if (game.timer <= 0) endRound(roomId, "Temps écoulé !", io);
  }, 1000);
}

export function triggerRoundStart(roomId, io) {
  const room = roomGames[roomId];
  if (!room || room.game.isActive || room.game.isPaused) return;
  clearTimeout(room.game.readyTimer);
  room.game.readyTimer = null;
  room.game.isSyncWaiting = false;
  room.game.isActive = true;
  room.game.startTime = Date.now();
  room.game.timer = room.game.roundDuration;
  io.to(`room:${roomId}`).emit("round_start_sync");
  startTimer(roomId, io);
}

export async function startNextRound(roomId, io) {
  const room = getOrCreateRoom(roomId);
  const game = room.game;

  if (
    game.currentRound >= game.maxRounds ||
    game.sessionPlaylist.length === 0
  ) {
    await finishGame(room, io);
    return;
  }

  // Partie finie, relancée ou room libérée pendant la recherche : manche périmée
  const prep = (game._prepId = (game._prepId ?? 0) + 1);
  const stale = () =>
    roomGames[roomId] !== room || !game.inProgress || game._prepId !== prep;

  io.to(`room:${roomId}`).emit("round_loading");

  game.currentRound++;
  game.firstFullFinder = null;
  game.fullFinders = [];
  game.totalFullFound = 0;
  resetRoundFlags(room);
  game.currentTrack = game.sessionPlaylist.pop();

  try {
    const track = game.currentTrack;

    // Extrait Deezer ou iTunes : aucun appel YouTube pendant une partie
    let videoId = null,
      ytAudio = null;
    let prefetched = null;

    const takePrefetched = () => {
      if (game.prefetchedRound?.track !== track) return;
      prefetched = game.prefetchedRound;
      ({ videoId, ytAudio } = prefetched);
      game.prefetchedRound = null;
    };
    takePrefetched();

    // Prefetch en cours mais pas encore terminé → on l'attend (max 13s)
    if (!ytAudio && game._prefetchPromise) {
      await Promise.race([
        game._prefetchPromise.catch(() => {}),
        new Promise((r) => setTimeout(r, 13000)),
      ]);
      game._prefetchPromise = null;
      takePrefetched();
    }

    if (!ytAudio) {
      const preview = await getPreview(track);
      if (preview) {
        videoId = preview.pKey;
        ytAudio = preview.entry;
      }
    }

    if (!ytAudio) throw new Error("No audio source");
    game.skipStreak = 0;

    let choices = undefined;
    if (room.game_mode === "qcm" && game.fullPlaylist.length >= 2) {
      const qcm = makeChoices(track, game.fullPlaylist);
      game.choices = qcm.choices;
      game.correctChoiceIndex = qcm.correctChoiceIndex;
      choices = qcm.choices;
    } else {
      game.choices = null;
      game.correctChoiceIndex = null;
    }

    // trackId sert au signalement d'un titre muet. Ne jamais ajouter ici
    // l'artiste ni le titre : lastRoundData part au client pendant la manche.
    // Même URL que celle annoncée en next_audio : le joueur l'a déjà en mémoire
    const audioUrl = prefetched?.audioUrl ?? audioUrlFor(videoId);
    game.lastRoundData = {
      startSeconds: 0,
      trackId: track.id ?? null,
      round: game.currentRound,
      total: game.plannedRounds,
      featCount: track.featArtists.length,
      extraLabels: (track.extraAnswers || []).map((e) => e.label),
      audioUrl,
      choices,
      cardsOff: cardsOffReason(game),
    };

    if (stale()) return;

    // Précharger la manche suivante pendant que celle-ci tourne
    if (game.sessionPlaylist.length > 0) {
      game._prefetchPromise = prefetchNextRound(roomId, io);
      game._prefetchPromise.catch(() => {});
    }

    // Pause pendant la préparation : la reprise annoncera cette manche
    if (game.isPaused) {
      game._roundHeld = true;
      return;
    }
    announceRound(room, io);
  } catch (err) {
    if (stale()) return;
    console.error(`Skip "${game.currentTrack?.title}":`, err.message);
    reportTrackIssue(
      game.currentTrack?.id,
      "audio",
      "auto",
      "Aucune source audio en room",
      {
        room: roomId,
      },
    );
    // Titre sans source audio : on ne consomme pas la manche, un titre de
    // réserve prend sa place. Après 3 échecs d'affilée (panne de Deezer et
    // d'iTunes), plus de réserve : la partie raccourcit au lieu de chercher.
    game.currentRound--;
    game.skipStreak = (game.skipStreak ?? 0) + 1;
    const spare = game.skipStreak <= 3 && game.spareTracks?.pop();
    if (spare) game.sessionPlaylist.unshift(spare);
    startNextRound(roomId, io);
  }
}

export async function finishGame(room, io) {
  const { game } = room;
  clearInterval(game.interval);
  clearTimeout(game.breakTimer);
  clearTimeout(game.readyTimer);
  game.interval = null;
  game.breakTimer = null;
  game.readyTimer = null;
  game.isSyncWaiting = false;
  game.isActive = false;
  game.inProgress = false;
  game.isPaused = false;
  game._pausedState = null;
  game._roundHeld = false;
  const finalScores = Object.values(room.players)
    .sort((a, b) => b.score - a.score)
    .map(sanitizePlayer);
  io?.to(`room:${room.roomId}`).emit("game_over", finalScores);
  await saveGameResults(room.roomId, finalScores, io);
}
