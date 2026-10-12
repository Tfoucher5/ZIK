import { supabase } from "../../config.js";
import { loadPlaylist } from "../../services/playlist.js";
import { customRooms, roomGames } from "../../state.js";
import { prefetchNextRound } from "./audio.js";
import { secureAt, settleCards } from "./cardFlow.js";
import { scheduleChatClear } from "./chat.js";
import { AUTO_START_DELAY } from "./config.js";
import { saveMidGamePlayer } from "./results.js";
import { cleanupRoom, resetScores, sanitizePlayer } from "./rooms.js";
import { startNextRound } from "./rounds.js";

// Map: roomId -> { timer, startAt, seconds }
export const autoStartCountdowns = {};

export function cancelAutoCountdown(roomId, io) {
  if (autoStartCountdowns[roomId]) {
    clearTimeout(autoStartCountdowns[roomId].timer);
    delete autoStartCountdowns[roomId];
    if (io) io.to(`room:${roomId}`).emit("game_countdown_cancelled");
  }
}

export async function startAutoCountdown(roomId, io) {
  if (autoStartCountdowns[roomId]) return; // already running
  const room = roomGames[roomId];
  if (room?.game?.adminBlocked) return;
  const startAt = Date.now();
  io.to(`room:${roomId}`).emit("game_countdown", { seconds: AUTO_START_DELAY });
  autoStartCountdowns[roomId] = {
    startAt,
    seconds: AUTO_START_DELAY,
    timer: setTimeout(() => {
      delete autoStartCountdowns[roomId];
      const room = roomGames[roomId];
      if (!room || room.game.inProgress) return;
      beginGame(room, io).catch(() => {});
    }, AUTO_START_DELAY * 1000),
  };
}

/**
 * Tire les titres, prévient la room et lance la première manche.
 * inProgress est posé avant les await : sinon chaque joueur qui demande à
 * rejouer lancerait sa propre boucle de manches en parallèle.
 */
export async function beginGame(room, io) {
  const { roomId, game } = room;
  game.inProgress = true;
  const playlist = await loadPlaylist(roomId, { fresh: true });
  if (playlist.length === 0) {
    game.inProgress = false;
    io.to(`room:${roomId}`).emit(
      "server_error",
      "Playlist indisponible, reessaie.",
    );
    return;
  }
  game.history = [];
  game.currentRound = 0;
  game.fullPlaylist = [...playlist];
  game.sessionPlaylist = [...playlist]
    .sort(() => Math.random() - 0.5)
    .slice(0, game.maxRounds);
  game.plannedRounds = game.sessionPlaylist.length;
  resetScores(room, io);
  io.to(`room:${roomId}`).emit("init_history", []);
  io.to(`room:${roomId}`).emit("game_starting");
  // Premier titre préchargé tout de suite : startNextRound attend cette
  // promesse si yt-dlp n'a pas fini
  game._prefetchPromise = prefetchNextRound(roomId, io);
  game._prefetchPromise.catch(() => {});
  try {
    const { data } = await supabase
      .from("games")
      .insert({
        room_id: roomId,
        rounds: game.maxRounds,
        mode: room.game_mode === "qcm" ? "qcm" : "classic",
      })
      .select()
      .single();
    if (data) {
      game.dbGameId = data.id;
      game.savedPlayers = new Set();
    }
  } catch {
    /* non bloquant */
  }
  startNextRound(roomId, io);
}

/**
 * Session de jeu déjà ouverte par ce compte, toutes rooms confondues.
 * Un joueur en délai de grâce (_dcTimer) ne compte pas : son onglet est parti.
 * Rejoindre la room où il joue déjà, sous le même pseudo, est une reconnexion.
 */
export function findAccountSession(userId, roomId, username) {
  for (const room of Object.values(roomGames)) {
    for (const p of Object.values(room.players)) {
      if (p.userId !== userId || p.isGuest || p._dcTimer) continue;
      if (room.roomId === roomId && p.name === username) continue;
      return { roomId: room.roomId, name: p.name };
    }
  }
  return null;
}

/** Libère la place occupée par l'ancien onglet et le renvoie vers /rooms. */
export function releaseAccountSession({ roomId, name }, io) {
  const room = roomGames[roomId];
  if (!room) return;
  const socketId = room.nameToSocket[name];
  const old = socketId ? io.sockets.sockets.get(socketId) : null;
  if (old) old.emit("session_taken_over");
  // Faux socket si l'onglet n'est plus joignable : leaveRoom n'a besoin que de
  // l'id pour retrouver le joueur et sauvegarder son score en cours
  leaveRoom(old || { id: socketId, leave: () => {} }, roomId, io);
  old?.disconnect();
}

export function leaveRoom(socket, roomId, io) {
  const room = roomGames[roomId];
  if (!room) return;
  const name = room.socketToName[socket.id];
  if (name) {
    delete room.nameToSocket[name];
    delete room.socketToName[socket.id];
    if (room.players[name]) {
      clearTimeout(room.players[name]._dcTimer);

      // Capturer l'état au moment du départ — room.game peut changer en 5s
      const playerSnapshot = { ...room.players[name] };
      // wasActive ne suffit pas : entre deux manches isActive=false, pourtant la partie est en cours
      const wasInGame = !!room.game.dbGameId && room.game.currentRound > 0;
      const dbGameId = room.game.dbGameId;
      // Référence à l'objet game, pas à roomGames[roomId] : la room peut avoir
      // été libérée de la mémoire avant que ce timer ne se déclenche
      const gameRef = room.game;
      const gameMode = room.game_mode;
      const totalPlayers = Object.keys(room.players).length;

      room.players[name]._dcTimer = setTimeout(() => {
        // Sauvegarder si la partie était en cours et que ce joueur n'a pas déjà été persisté
        if (
          wasInGame &&
          dbGameId &&
          playerSnapshot.score > 0 &&
          !gameRef.savedPlayers.has(name)
        ) {
          gameRef.savedPlayers.add(name);
          saveMidGamePlayer(
            dbGameId,
            playerSnapshot,
            gameMode,
            totalPlayers,
          ).catch(() => {});
        }

        // Cartes provisoires : gardées si le joueur a fait au moins la moitié
        // des manches, perdues sinon
        if (playerSnapshot.userId && !playerSnapshot.isGuest)
          settleCards({
            game: gameRef,
            name,
            userId: playerSnapshot.userId,
            keep:
              (playerSnapshot.roundsPresent || 0) >=
              secureAt(gameRef.plannedRounds),
          }).catch(() => {});

        if (!roomGames[roomId]) return;
        delete room.players[name];
        const active = Object.values(room.players)
          .filter((p) => !p._dcTimer)
          .map(sanitizePlayer);
        io.to(`room:${roomId}`).emit("update_players", active);

        if (active.length === 0) {
          cancelAutoCountdown(roomId, null); // cancel silently — no players to notify
          scheduleChatClear(roomId);
          if (room.game.isActive) {
            clearInterval(room.game.interval);
            clearTimeout(room.game.breakTimer);
            room.game.interval = null;
            room.game.breakTimer = null;
            room.game.isActive = false;
            console.log(`Room "${roomId}" vide — partie stoppee`);
          }
          if (customRooms[roomId]) {
            room._emptyTimer = setTimeout(
              () => cleanupRoom(roomId),
              15 * 60 * 1000,
            );
          } else {
            cleanupRoom(roomId);
          }
        }
      }, 5_000);
    }
  }
  socket.leave(`room:${roomId}`);
}
