import { supabase } from "../../config.js";
import { customRooms, dbRooms, roomGames } from "../../state.js";
import { resetCards } from "./cardFlow.js";
import { DEFAULT_BREAK_DURATION, DEFAULT_ROUND_DURATION } from "./config.js";

export function sanitizePlayer(p) {
  return {
    name: p.name,
    userId: p.userId,
    isGuest: p.isGuest,
    score: p.score,
    foundArtist: p.foundArtist,
    foundTitle: p.foundTitle,
    foundFeats: p.foundFeats || [],
    // Pseudo du profil : celui de la place peut être « Alice 2 »
    profile: p.profileName,
  };
}

export function emitPlayers(room, io) {
  io?.to(`room:${room.roomId}`).emit(
    "update_players",
    Object.values(room.players).map(sanitizePlayer),
  );
}

export function getOrCreateRoom(roomId) {
  if (roomGames[roomId]) {
    if (roomGames[roomId]._emptyTimer) {
      clearTimeout(roomGames[roomId]._emptyTimer);
      roomGames[roomId]._emptyTimer = null;
    }
    return roomGames[roomId];
  }
  const cust = customRooms[roomId] || dbRooms[roomId];
  roomGames[roomId] = {
    roomId,
    game_mode: cust?.game_mode || "classic",
    players: {},
    socketToName: {},
    nameToSocket: {},
    game: {
      isActive: false,
      // Vrai du lancement au game_over, pauses entre manches comprises
      inProgress: false,
      currentRound: 0,
      maxRounds: cust?.max_rounds || cust?.maxRounds || 10,
      roundDuration:
        cust?.round_duration || cust?.roundDuration || DEFAULT_ROUND_DURATION,
      breakDuration:
        cust?.break_duration || cust?.breakDuration || DEFAULT_BREAK_DURATION,
      timer: 0,
      interval: null,
      breakTimer: null,
      currentTrack: null,
      startTime: 0,
      sessionPlaylist: [],
      fullPlaylist: [],
      history: [],
      firstFullFinder: null,
      totalFullFound: 0,
      lastRoundData: null,
      dbGameId: null,
      // Pseudos déjà écrits dans game_players pour la partie en cours — évite
      // qu'un joueur soit persisté deux fois (fin de partie + départ)
      savedPlayers: new Set(),
      isSyncWaiting: false,
      readyPlayers: new Set(),
      readyTimer: null,
      readyRound: 0,
      choices: null,
      correctChoiceIndex: null,
    },
  };
  return roomGames[roomId];
}

// Plus personne pour jouer : la partie s'arrête pour de bon, une nouvelle peut
// démarrer. Sans inProgress à faux, une room gardée en mémoire resterait bloquée.
export function stopGame(room) {
  const { game } = room;
  clearTimeout(room._emptyTimer);
  clearInterval(game.interval);
  clearTimeout(game.breakTimer);
  clearTimeout(game.readyTimer);
  game.interval = null;
  game.breakTimer = null;
  game.readyTimer = null;
  game.isActive = false;
  game.inProgress = false;
  game.isSyncWaiting = false;
  game.isPaused = false;
  game._pausedState = null;
  game._roundHeld = false;
  if (game.dbGameId && !game._ended) {
    game._ended = true;
    (async () => {
      await supabase
        .from("games")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", game.dbGameId);
    })().catch(() => {});
  }
}

export function cleanupRoom(roomId) {
  const room = roomGames[roomId];
  if (!room) return;
  stopGame(room);
  delete roomGames[roomId];
  console.log(`Room "${roomId}" liberee de la memoire`);
}

export function resetPlayerRound(p) {
  p.foundArtist = false;
  p.foundTitle = false;
  p.foundFeats = [];
  p.foundExtras = [];
  p._fullFoundCounted = false;
  p._qcmAnswered = false;
  p.guessesThisRound = 0;
}

export function resetRoundFlags(room) {
  Object.values(room.players).forEach(resetPlayerRound);
}

export function resetScores(room, io) {
  Object.keys(room.players).forEach((n) => {
    room.players[n].score = 0;
    room.players[n].roundsFullFound = 0;
  });
  resetCards(room);
  emitPlayers(room, io);
}
