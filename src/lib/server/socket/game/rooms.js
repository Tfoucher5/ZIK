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

export function cleanupRoom(roomId) {
  const room = roomGames[roomId];
  if (!room) return;
  clearInterval(room.game.interval);
  clearTimeout(room.game.breakTimer);
  clearTimeout(room.game.readyTimer);
  room.game.interval = null;
  room.game.breakTimer = null;
  room.game.readyTimer = null;
  if (room.game.dbGameId && !room.game._ended) {
    room.game._ended = true;
    (async () => {
      await supabase
        .from("games")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", room.game.dbGameId);
    })().catch(() => {});
  }
  delete roomGames[roomId];
  console.log(`Room "${roomId}" liberee de la memoire`);
}

export function resetRoundFlags(room) {
  Object.keys(room.players).forEach((n) => {
    room.players[n].foundArtist = false;
    room.players[n].foundTitle = false;
    room.players[n].foundFeats = [];
    room.players[n].foundExtras = [];
    room.players[n]._fullFoundCounted = false;
    room.players[n]._qcmAnswered = false;
    room.players[n].guessesThisRound = 0;
  });
}

export function resetScores(room, io) {
  Object.keys(room.players).forEach((n) => {
    room.players[n].score = 0;
    room.players[n].roundsFullFound = 0;
  });
  resetCards(room);
  emitPlayers(room, io);
}
