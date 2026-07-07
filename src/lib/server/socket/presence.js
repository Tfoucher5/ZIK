import { verifyToken } from "../middleware/auth.js";
import { presence, roomGames, customRooms, dbRooms } from "../state.js";

// io ancré sur globalThis : en dev, le plugin Vite et les routes SSR chargent
// deux instances distinctes de ce module.
export function registerPresence(io) {
  globalThis.__zik_io = io;

  io.on("connection", (socket) => {
    socket.on("presence:hello", async (token) => {
      const user = await verifyToken(token);
      if (!user) return;
      socket.data.presenceUserId = user.id;
      let sockets = presence.get(user.id);
      if (!sockets) {
        sockets = new Set();
        presence.set(user.id, sockets);
      }
      sockets.add(socket.id);
    });

    socket.on("disconnect", () => {
      const uid = socket.data.presenceUserId;
      if (!uid) return;
      const sockets = presence.get(uid);
      if (sockets) {
        sockets.delete(socket.id);
        if (!sockets.size) presence.delete(uid);
      }
    });
  });
}

export function isOnline(userId) {
  return presence.has(userId);
}

// Room active (jeu classique) où joue un utilisateur connecté.
export function currentRoomOf(userId) {
  for (const [roomId, room] of Object.entries(roomGames)) {
    for (const p of Object.values(room.players || {})) {
      if (p.userId === userId && !p.isGuest && !p._dcTimer) {
        const meta = customRooms[roomId] || dbRooms[roomId];
        return {
          roomId,
          roomName: meta?.name || roomId,
          gameMode: room.game_mode || "classic",
        };
      }
    }
  }
  return null;
}

// Pousse une notification en temps réel à tous les onglets d'un utilisateur.
export function pushNotify(userId, notification) {
  const io = globalThis.__zik_io;
  const sockets = presence.get(userId);
  if (!io || !sockets) return;
  for (const sid of sockets) io.to(sid).emit("notify", notification);
}
