import { getAdminClient } from "../../config.js";
import { loadPlaylist } from "../../services/playlist.js";
import {
  chatHistories,
  customRooms,
  dbRooms,
  playlistCache,
} from "../../state.js";
import { identifyPlayer } from "./cardFlow.js";
import { cancelChatClear } from "./chat.js";
import {
  autoStartCountdowns,
  beginGame,
  cancelAutoCountdown,
  findAccountSession,
  leaveRoom,
  releaseAccountSession,
  startAutoCountdown,
} from "./lobby.js";
import { emitPlayers, getOrCreateRoom } from "./rooms.js";

// Arrivée dans une room, lancement d'une partie, départ
export function registerJoin(socket, io) {
  socket.on("join_room", async (payload) => {
    const {
      roomId,
      username: rawName,
      userId,
      isGuest,
      takeover,
      token,
    } = payload;
    let username = rawName;
    if (!username?.trim()) return socket.emit("error", "Pseudo requis");

    // Client service : une room privée est invisible pour la clé anonyme
    if (!customRooms[roomId] && !dbRooms[roomId]) {
      const { data: freshRoom } = await getAdminClient()
        .from("rooms")
        .select(
          "id, code, name, emoji, max_rounds, round_duration, break_duration, playlist_id, auto_start, owner_id, is_public, is_official, game_mode",
        )
        .eq("code", roomId)
        .single();
      if (!freshRoom) return socket.emit("error", "Room inconnue ou expiree");
      dbRooms[roomId] = freshRoom;
    }

    username = username.trim();

    // Un compte ne tient qu'une session de jeu à la fois, toutes rooms
    // confondues : un second onglet doublerait son score. Rejoindre la même
    // room sous le même pseudo reste une reconnexion (géré plus bas).
    if (userId && isGuest === false) {
      const busy = findAccountSession(userId, roomId, username);
      if (busy) {
        if (!takeover) {
          const meta = dbRooms[busy.roomId] || customRooms[busy.roomId] || {};
          return socket.emit("join_refused", {
            roomId: busy.roomId,
            roomName: meta.name || busy.roomId,
            playerName: busy.name,
          });
        }
        releaseAccountSession(busy, io);
      }
    }

    const room = getOrCreateRoom(roomId);

    if (socket.currentRoom) leaveRoom(socket, socket.currentRoom, io);

    socket.join(`room:${roomId}`);
    socket.currentRoom = roomId;
    socket.currentUser = { username, userId, isGuest };

    if (!room.players[username]) {
      room.players[username] = {
        name: username,
        userId: userId || null,
        isGuest: isGuest !== false,
        score: 0,
        foundArtist: false,
        foundTitle: false,
        foundFeats: [],
        foundExtras: [],
        _fullFoundCounted: false,
      };
    } else {
      clearTimeout(room.players[username]._dcTimer);
      delete room.players[username]._dcTimer;
      const oldSocketId = room.nameToSocket[username];
      if (oldSocketId) delete room.socketToName[oldSocketId];
    }

    room.socketToName[socket.id] = username;
    room.nameToSocket[username] = socket.id;

    const joined = room.players[username];
    identifyPlayer(joined, { token, userId }, socket)
      .then(() => {
        if (joined.cardsInPlay?.length)
          socket.emit("cards_in_play", joined.cardsInPlay);
      })
      .catch(() => {});

    emitPlayers(room, io);

    if (!playlistCache[roomId] && dbRooms[roomId]) {
      loadPlaylist(roomId)
        .then((tracks) => {
          if (tracks.length > 0)
            socket.emit("track_count_update", tracks.length);
        })
        .catch(() => {});
    }

    const cust = customRooms[roomId] || dbRooms[roomId];
    const dbRoom = dbRooms[roomId];
    const autoStart = dbRoom?.auto_start || false;
    const ownerId = dbRoom?.owner_id || null;
    const isAdmin = !!(
      userId &&
      ownerId &&
      String(userId).trim().toLowerCase() ===
        String(ownerId).trim().toLowerCase()
    );

    socket.emit("room_joined", {
      roomId,
      roomConfig: {
        id: roomId,
        name: cust?.name,
        emoji: cust?.emoji,
        trackCount:
          customRooms[roomId]?.tracks?.length ||
          playlistCache[roomId]?.length ||
          null,
        maxRounds: cust?.max_rounds || cust?.maxRounds,
        autoStart,
        isAdmin,
        hasOwner: !!ownerId,
        adminBlocked: room.game.adminBlocked ?? false,
        gameMode: room.game_mode || "classic",
      },
    });
    socket.emit("init_history", room.game.history);

    cancelChatClear(roomId);
    const existingChat = chatHistories[roomId];
    if (existingChat?.messages.length)
      socket.emit("chat_history", existingChat.messages);

    if (
      room.game.lastRoundData &&
      (room.game.isActive || room.game.isSyncWaiting)
    ) {
      socket.emit("start_round", room.game.lastRoundData);
      if (room.game.isActive && !room.game.isPaused) {
        // Round déjà synchro — le nouveau joueur reprend au bon endroit de l'extrait
        socket.emit("round_start_sync", {
          elapsed: room.game.startTime
            ? (Date.now() - room.game.startTime) / 1000
            : 0,
        });
      }
      // Si isSyncWaiting, le client émettra player_ready quand YouTube sera prêt
    } else if (autoStart && !room.game.inProgress) {
      if (autoStartCountdowns[roomId]) {
        // Countdown already running — tell this player the remaining time
        const elapsed =
          (Date.now() - autoStartCountdowns[roomId].startAt) / 1000;
        const remaining = Math.max(
          1,
          Math.ceil(autoStartCountdowns[roomId].seconds - elapsed),
        );
        socket.emit("game_countdown", { seconds: remaining });
      } else {
        startAutoCountdown(roomId, io);
      }
    }

    console.log(`${username} -> room "${roomId}"`);
  });

  socket.on("request_new_game", async () => {
    const roomId = socket.currentRoom;
    if (!roomId) return;
    const room = getOrCreateRoom(roomId);
    if (room.game.inProgress) return;
    if (room.game.adminBlocked) {
      socket.emit("server_error", "Partie bloquée par un administrateur.");
      return;
    }

    // Manual-mode DB rooms: only the owner can start
    const dbRoom = dbRooms[roomId];
    if (dbRoom && !dbRoom.auto_start) {
      const name = room.socketToName[socket.id];
      const player = room.players[name];
      const pId = String(player?.userId || "")
        .trim()
        .toLowerCase();
      const oId = String(dbRoom.owner_id || "")
        .trim()
        .toLowerCase();
      if (!pId || !oId || pId !== oId) {
        return socket.emit(
          "server_error",
          "Seul l’administrateur peut lancer la partie.",
        );
      }
    }

    cancelAutoCountdown(roomId, io);
    await beginGame(room, io);
  });

  socket.on("disconnect", () => {
    if (socket.currentRoom) leaveRoom(socket, socket.currentRoom, io);
  });
}
