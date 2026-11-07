import { getAdminClient } from "../../config.js";
import { loadPlaylist } from "../../services/music/playlist.js";
import {
  chatHistories,
  customRooms,
  dbRooms,
  playlistCache,
} from "../../state.js";
import { identifyPlayer } from "./cardFlow.js";
import { cancelChatClear } from "./chat.js";
import { accountName, seatName, verifiedAccount } from "./identity.js";
import {
  autoStartCountdowns,
  beginGame,
  cancelAutoCountdown,
  findAccountSession,
  leaveRoom,
  releaseAccountSession,
  restoreDeparted,
  startAutoCountdown,
} from "./lobby.js";
import { emitPlayers, getOrCreateRoom } from "./rooms.js";
import { bool, key, optional, safe, str } from "../safe.js";

const JOIN_ROOM = {
  roomId: key(64),
  username: str(100),
  userId: optional(str(64)),
  isGuest: optional(bool()),
  takeover: optional(bool()),
  token: optional(str(8192)),
  prevSid: optional(str(64)),
};

// Arrivée dans une room, lancement d'une partie, départ
export function registerJoin(socket, io) {
  safe(socket, "join_room", JOIN_ROOM, async (payload) => {
    const {
      roomId,
      username: rawName,
      userId,
      isGuest,
      takeover,
      token,
      prevSid,
    } = payload;
    let username = rawName;
    // Le pseudo sert de clé de room.players : « __proto__ » viserait Object.prototype
    if (!username.trim() || username.trim() in Object.prototype)
      return socket.emit("server_error", "Choisis un pseudo pour jouer.");

    // Client service : une room privée est invisible pour la clé anonyme
    if (!customRooms[roomId] && !dbRooms[roomId]) {
      const { data: freshRoom, error } = await getAdminClient()
        .from("rooms")
        .select(
          "id, code, name, emoji, max_rounds, round_duration, break_duration, playlist_id, auto_start, owner_id, is_public, is_official, game_mode",
        )
        .eq("code", roomId)
        .single();
      // PGRST116 : aucune ligne. Toute autre erreur est une panne : la room existe
      // peut-être, renvoyer le joueur le ferait sortir de sa partie.
      if (!freshRoom && error && error.code !== "PGRST116")
        return socket.emit(
          "server_error",
          "Connexion à la room impossible pour l’instant. Recharge la page dans un moment.",
        );
      if (!freshRoom) return socket.emit("room_unknown");
      dbRooms[roomId] = freshRoom;
    }

    const accountId = await verifiedAccount({ userId, isGuest, token });
    const profileName = accountId ? await accountName(accountId) : null;
    username = profileName ?? username.trim();
    // Parti pendant les vérifications : son disconnect est déjà passé, personne
    // ne libérerait la place
    if (socket.connected === false) return;

    // Un compte ne tient qu'une session de jeu à la fois, toutes rooms
    // confondues : un second onglet doublerait son score. Rejoindre la même
    // room sous le même pseudo reste une reconnexion (géré plus bas).
    if (accountId) {
      const busy = findAccountSession(accountId, roomId, username, [
        socket.id,
        prevSid,
      ]);
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
    const sameSocket = !!room.socketToName[socket.id];
    // Calculé avant leaveRoom : qui rejoint sa propre room garde sa place
    username = seatName(room, username, {
      socketId: socket.id,
      accountId,
      prevSid,
    });

    if (socket.currentRoom) leaveRoom(socket, socket.currentRoom, io);

    socket.join(`room:${roomId}`);
    socket.currentRoom = roomId;
    restoreDeparted(room, username);

    if (!room.players[username]) {
      room.players[username] = {
        name: username,
        userId: accountId,
        isGuest: !accountId,
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
      // Autre onglet encore ouvert : il ne jouerait plus, sans savoir pourquoi
      if (oldSocketId && ![socket.id, prevSid].includes(oldSocketId)) {
        const old = io.sockets?.sockets.get(oldSocketId);
        old?.emit("session_taken_over");
        old?.disconnect();
      }
    }

    room.socketToName[socket.id] = username;
    room.nameToSocket[username] = socket.id;

    const joined = room.players[username];
    joined._lastSocket = socket.id;
    if (profileName) joined.profileName = profileName;
    // Vérification ratée à l'arrivée, réussie maintenant : le compte retrouve
    // sa place et ses points
    if (accountId && !joined.userId) {
      joined.userId = accountId;
      joined.isGuest = false;
    }
    // Jeton déjà vérifié : un mauvais jeton ne coûte pas un second appel à l'auth.
    // Un compte revenu pendant une panne d'auth garde ses droits aux cartes.
    if (accountId || !joined.userId)
      identifyPlayer(
        joined,
        { token: accountId ? token : null, userId: joined.userId },
        socket,
      )
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
      joined.userId &&
      ownerId &&
      String(joined.userId).trim().toLowerCase() ===
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
        // Ce que le serveur a retenu : le client s'y aligne
        username,
        isGuest: joined.isGuest,
      },
    });
    // Nouvelle vérification du compte sur le même socket : rejouer la manche
    // viderait la saisie du joueur et relancerait l'extrait
    if (sameSocket) return;
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
      // Si isSyncWaiting, le client émettra player_ready quand l'audio sera prêt
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

  safe(socket, "request_new_game", {}, async () => {
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

  safe(socket, "disconnect", {}, () => {
    if (socket.currentRoom) leaveRoom(socket, socket.currentRoom, io);
  });
}
