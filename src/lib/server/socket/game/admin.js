import { chatHistories, getIO, roomGames } from "../../state.js";
import { addChatMessage } from "./chat.js";
import { cancelAutoCountdown } from "./lobby.js";
import { emitPlayers } from "./rooms.js";
import { endRound, finishGame, startNextRound, startTimer } from "./rounds.js";

// Pilotage des rooms depuis l'admin

export function adminGetRoomsSnapshot() {
  return Object.values(roomGames).map((room) => ({
    roomId: room.roomId,
    playerCount: Object.keys(room.players).length,
    players: Object.values(room.players).map((p) => ({
      name: p.name,
      score: p.score,
      foundArtist: p.foundArtist,
      foundTitle: p.foundTitle,
    })),
    isActive: room.game.isActive,
    isPaused: room.game.isPaused ?? false,
    adminBlocked: room.game.adminBlocked ?? false,
    currentRound: room.game.currentRound,
    maxRounds: room.game.maxRounds,
    timer: room.game.timer,
    roundDuration: room.game.roundDuration,
    isSyncWaiting: room.game.isSyncWaiting,
    readyCount: room.game.readyPlayers?.size ?? 0,
    currentTrack: room.game.currentTrack
      ? {
          artist:
            room.game.currentTrack.mainArtist || room.game.currentTrack.artist,
          title: room.game.currentTrack.title,
        }
      : null,
  }));
}

export function adminPauseRoom(roomId) {
  const room = roomGames[roomId];
  if (!room || room.game.isPaused) return false;
  const io = getIO();
  // Sauvegarder l'état avant pause
  if (room.game.interval) {
    room.game._pausedState = "round";
    clearInterval(room.game.interval);
    room.game.interval = null;
  } else if (room.game.breakTimer) {
    room.game._pausedState = "break";
    clearTimeout(room.game.breakTimer);
    room.game.breakTimer = null;
  } else {
    room.game._pausedState = "none";
  }
  // Annuler readyTimer + auto-countdown
  if (room.game.readyTimer) {
    clearTimeout(room.game.readyTimer);
    room.game.readyTimer = null;
    room.game.isSyncWaiting = false;
  }
  cancelAutoCountdown(roomId, io);
  room.game.isPaused = true;
  io?.to(`room:${roomId}`).emit("admin_pause");
  return true;
}

export function adminResumeRoom(roomId) {
  const room = roomGames[roomId];
  if (!room || !room.game.isPaused) return false;
  const io = getIO();
  room.game.isPaused = false;
  const state = room.game._pausedState ?? "none";
  room.game._pausedState = null;

  if (state === "round") startTimer(roomId, io);
  else if (state === "break") {
    room.game.breakTimer = setTimeout(() => {
      room.game.breakTimer = null;
      startNextRound(roomId, io);
    }, 1000);
  }
  io?.to(`room:${roomId}`).emit("admin_resume");
  return true;
}

export function adminSkipRound(roomId) {
  const room = roomGames[roomId];
  if (!room || !room.game.isActive) return false;
  const io = getIO();
  room.game._skipped = true;
  endRound(roomId, "Round sauté par l'admin", io);
  return true;
}

export async function adminEndGame(roomId) {
  const room = roomGames[roomId];
  if (!room) return false;
  // Une partie coupée par l'admin compte comme une partie jouée
  await finishGame(room, getIO());
  return true;
}

export function adminAnnounce(roomId, message) {
  const room = roomGames[roomId];
  if (!room) return false;
  const msg = String(message ?? "")
    .trim()
    .slice(0, 200);
  if (!msg) return false;
  getIO()?.to(`room:${roomId}`).emit("admin_announce", { message: msg });
  return true;
}

export function adminBlockRoom(roomId) {
  const room = roomGames[roomId];
  if (!room) return false;
  const io = getIO();
  room.game.adminBlocked = true;
  cancelAutoCountdown(roomId, io);
  io?.to(`room:${roomId}`).emit("admin_blocked");
  return true;
}

export function adminUnblockRoom(roomId) {
  const room = roomGames[roomId];
  if (!room) return false;
  room.game.adminBlocked = false;
  getIO()?.to(`room:${roomId}`).emit("admin_unblocked");
  return true;
}

export function adminCloseRoom(roomId) {
  const room = roomGames[roomId];
  if (!room) return false;
  const io = getIO();
  clearInterval(room.game.interval);
  clearTimeout(room.game.breakTimer);
  clearTimeout(room.game.readyTimer);
  io?.to(`room:${roomId}`).emit("room_force_closed", {
    message: "La room a été fermée par un administrateur.",
  });
  io?.socketsLeave(`room:${roomId}`);
  delete roomGames[roomId];
  return true;
}

export function adminGetChatHistory(roomId) {
  return chatHistories[roomId]?.messages ?? [];
}

export function adminSendChat(roomId, text, adminName) {
  const io = getIO();
  if (!io) return false;
  const msg = String(text || "")
    .trim()
    .slice(0, 120);
  if (!msg) return false;
  const name = `${adminName || "Admin"} - admin`;
  const message = { name, text: msg, ts: Date.now() };
  addChatMessage(roomId, message);
  io.to(`room:${roomId}`).emit("chat_message", message);
  return true;
}

export function adminKickPlayer(roomId, username) {
  const room = roomGames[roomId];
  if (!room || !room.players[username]) return false;
  const io = getIO();
  const socketId = room.nameToSocket[username];
  if (socketId)
    io?.to(socketId).emit("admin_kicked", {
      reason: "Expulsé par un administrateur",
    });
  delete room.players[username];
  delete room.nameToSocket[username];
  for (const sid of Object.keys(room.socketToName)) {
    if (room.socketToName[sid] === username) delete room.socketToName[sid];
  }
  emitPlayers(room, io);
  return true;
}
