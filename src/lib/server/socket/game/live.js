import { roomGames } from "../../state.js";
import { addChatMessage } from "./chat.js";
import { triggerRoundStart } from "./rounds.js";

// Chat et synchro du départ de manche
export function registerLive(socket, io) {
  socket.on("send_chat", (msg) => {
    const roomId = socket.currentRoom;
    if (!roomId) return;
    const room = roomGames[roomId];
    if (!room) return;
    const name = room.socketToName[socket.id];
    if (!name) return;

    const text = String(msg || "")
      .trim()
      .slice(0, 120);
    if (!text) return;

    // Rate limit : 1 message / 1.5s par joueur
    const now = Date.now();
    if (
      room.players[name]?._lastChat &&
      now - room.players[name]._lastChat < 1500
    )
      return;
    if (room.players[name]) room.players[name]._lastChat = now;

    const message = { name, text, ts: now };
    addChatMessage(roomId, message);
    io.to(`room:${roomId}`).emit("chat_message", message);
  });

  socket.on("player_ready", () => {
    const roomId = socket.currentRoom;
    if (!roomId) return;
    const room = roomGames[roomId];
    if (!room || !room.game.isSyncWaiting) return;

    const name = room.socketToName[socket.id];
    if (!name) return;

    room.game.readyPlayers.add(name);

    const activePlayers = Object.values(room.players).filter(
      (p) => !p._dcTimer,
    ).length;
    const threshold = Math.max(1, Math.round(activePlayers * 0.75));

    io.to(`room:${roomId}`).emit("ready_update", {
      ready: room.game.readyPlayers.size,
      total: activePlayers,
    });

    if (room.game.readyPlayers.size >= threshold) {
      triggerRoundStart(roomId, io);
    }
  });
}
