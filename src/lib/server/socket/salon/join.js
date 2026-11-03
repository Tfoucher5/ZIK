import { FREE_MAX_PLAYERS } from "../../../data/proPlans.js";
import { verifyToken } from "../../middleware/auth.js";
import { alertAdminsSafe } from "../../services/admin/alerts.js";
import { salonRooms } from "../../state.js";
import {
  addPlayer,
  broadcastRoster,
  broadcastScreens,
  cleanUsername,
  getPlayerList,
  nightView,
  reconnectView,
  standings,
} from "./players.js";
import { checkEveryoneDone } from "./rounds.js";
import { departPlayer, nameTaken } from "./departed.js";
import { currentTrackInfo } from "./tracks.js";
import { announceNextVideo, prepareSession } from "./session.js";
import { supportView } from "./support.js";
import { eveningView } from "./evening.js";
import { cleanupNow, scheduleCleanup } from "./timers.js";
import { key, optional, safe, str } from "../safe.js";

// key absente (TV ouverte avec le seul code) : le handler répond « réservé à l'hôte »
const SCREEN_JOIN = { code: key(64), key: optional(str(200)) };
const PLAYER_JOIN = {
  code: key(64),
  username: str(100),
  token: optional(key(200)),
  auth: optional(str(8192)),
};

// Large : un PC de bar qui se met en veille ou un onglet rechargé ne doit pas
// fermer la soirée
const HOST_RECONNECT_GRACE = 10 * 60 * 1000; // 10 min
// Entre deux parties ou en pause : l'ordi de la TV peut se mettre en veille
// pendant l'entracte sans que la soirée soit perdue
const HOST_IDLE_GRACE = 2 * 60 * 60 * 1000; // 2 h
// Un téléphone verrouillé le temps d'un passage au comptoir garde sa place
const PLAYER_RECONNECT_GRACE = 10 * 60 * 1000; // 10 min

// Arrivées et départs : écran TV, régie, joueurs
export function registerJoin(socket, io) {
  // ── Host connects to their salon ──────────────────────────────────────────
  // ── Écran TV : public avec le code, pilotable seulement avec la clé ──────
  safe(socket, "salon_join_host", SCREEN_JOIN, ({ code, key }) => {
    const salon = salonRooms[code];
    if (!salon)
      return socket.emit("salon_error", { message: "Salon introuvable." });
    if (!key || key !== salon.adminKey)
      return socket.emit("salon_error", {
        message: "Cet écran est réservé à l'hôte du salon.",
      });

    clearTimeout(salon._hostDcTimer);
    salon._hostDcTimer = null;

    socket.join(`salon:${code}`);
    socket.join(`salon:screens:${code}`);
    socket.salonCode = code;
    socket.salonRole = "screen";
    socket.salonAdmin = true;

    socket.emit("salon_host_joined", {
      pro: salon.pro,
      settings: salon.settings,
      players: getPlayerList(salon),
      teams: standings(salon),
      night: nightView(salon),
      evening: eveningView(salon),
      mediaCheck: salon.game.mediaCheck ?? null,
      buzzer: salon.game.buzzer ?? null,
      phase: salon.game.phase,
      paused: salon.game.paused,
      currentRound: salon.game.currentRound,
      support: supportView(salon),
    });
    if (salon.game.phase === "lobby" && !salon.game.sessionPlaylist.length)
      prepareSession(code, io);
    else announceNextVideo(salon, io);
    scheduleCleanup(code);
    broadcastScreens(code, io);
  });

  // ── Régie : l'écran de pilotage, à côté de la TV ─────────────────────────
  safe(socket, "salon_join_control", SCREEN_JOIN, ({ code, key }) => {
    const salon = salonRooms[code];
    if (!salon)
      return socket.emit("salon_error", { message: "Salon introuvable." });
    if (!key || key !== salon.adminKey)
      return socket.emit("salon_error", {
        message: "Lien de régie invalide.",
      });

    clearTimeout(salon._hostDcTimer);
    salon._hostDcTimer = null;
    socket.join(`salon:${code}`);
    socket.join(`salon:ctrl:${code}`);
    socket.salonCode = code;
    socket.salonRole = "control";
    socket.salonAdmin = true;

    const game = salon.game;
    socket.emit("salon_control_joined", {
      pro: salon.pro,
      settings: salon.settings,
      players: getPlayerList(salon),
      teams: standings(salon),
      night: nightView(salon),
      evening: eveningView(salon),
      mediaCheck: game.mediaCheck ?? null,
      buzzer: game.buzzer ?? null,
      phase: game.phase,
      paused: game.paused,
      currentRound: game.currentRound,
      timerVal: game.timerValue,
      timerMax: game.timerMax ?? salon.settings.roundDuration,
      timerActive: game.timerActive,
      track:
        game.phase === "round" || game.phase === "summary"
          ? currentTrackInfo(salon)
          : null,
      history: game.history,
      trackCount: game.fullPlaylist.length,
      support: supportView(salon),
    });
    scheduleCleanup(code);
    broadcastScreens(code, io);
  });

  // ── Player joins ──────────────────────────────────────────────────────────
  safe(
    socket,
    "salon_join_player",
    PLAYER_JOIN,
    async ({ code, username, token, auth }) => {
      // Compte du joueur s'il est connecté : sa fiche admin liste ses salons
      const account = auth ? await verifyToken(auth).catch(() => null) : null;
      username = cleanUsername(username);
      if (!username || username in Object.prototype)
        return socket.emit("salon_error", { message: "Pseudo requis." });

      const salon = salonRooms[code];
      if (!salon)
        return socket.emit("salon_error", {
          message: "Salon introuvable ou expiré.",
        });

      // ── Reconnect path: player was already in the game ────────────────────
      // Un retardataire entre dans la partie en cours avec 0 point, par le même
      // chemin qu'une reconnexion. Pendant le podium (gameover), il passe par le
      // join normal et attend la partie suivante.
      if (
        !salon.players[username] &&
        !salon.pro &&
        Object.keys(salon.players).length >= FREE_MAX_PLAYERS
      ) {
        salon.limitHits = (salon.limitHits ?? 0) + 1;
        alertAdminsSafe(
          "admin_upsell",
          {
            title: `Salon ${code} plein`,
            body: `Un joueur de plus a été refusé (limite gratuite de ${FREE_MAX_PLAYERS}).`,
            url: `/admin/salons?code=${code}`,
            tag: `full:${code}`,
          },
          { throttleMs: 60 * 60 * 1000 },
        );
        io.to(`salon:ctrl:${code}`).emit("salon_pro_required", {
          feature: "players",
        });
        return socket.emit("salon_error", {
          message: "Le salon est complet.",
        });
      }

      if (salon.banned.has(username.toLowerCase()) || salon.banned.has(token))
        return socket.emit("salon_error", {
          message: "L'hôte t'a retiré de ce salon.",
        });

      const taken = nameTaken(salon, username);
      if (taken && taken.token !== token)
        return socket.emit("salon_error", {
          message: "Ce pseudo est déjà pris.",
        });

      const late =
        !salon.players[username] &&
        salon.game.phase !== "lobby" &&
        salon.game.phase !== "gameover";
      if (late)
        addPlayer(salon, username, socket.id, token).scoreBeforeRound ??= 0;
      if (salon.players[username]) {
        const existing = salon.players[username];
        // Cancel pending removal timer
        clearTimeout(existing._dcTimer);
        existing._dcTimer = null;
        existing._disconnected = false;
        existing.socketId = socket.id;
        if (account) existing.userId = account.id;

        socket.join(`salon:${code}`);
        socket.join(`salon:players:${code}`);
        socket.salonCode = code;
        socket.salonRole = "player";
        socket.salonUsername = username;

        socket.emit("salon_joined", reconnectView(salon, existing));
        broadcastRoster(code, io);
        scheduleCleanup(code);
        return;
      }

      const player = addPlayer(salon, username, socket.id, token);
      if (account) player.userId = account.id;

      socket.join(`salon:${code}`);
      socket.join(`salon:players:${code}`);
      socket.salonCode = code;
      socket.salonRole = "player";
      socket.salonUsername = username;

      socket.emit("salon_joined", {
        username,
        token: player.token,
        settings: {
          answerMode: salon.settings.answerMode,
          maxRounds: salon.settings.maxRounds,
        },
        team: player.team,
        teams: standings(salon),
        players: getPlayerList(salon),
        evening: eveningView(salon),
      });
      broadcastRoster(code, io);
      scheduleCleanup(code);
    },
  );

  // ── Disconnect ────────────────────────────────────────────────────────────
  safe(socket, "disconnect", {}, () => {
    const code = socket.salonCode;
    if (!code) return;
    const salon = salonRooms[code];
    if (!salon) return;

    if (socket.salonRole === "screen" || socket.salonRole === "control") {
      // Un écran de moins : la régie doit le voir tout de suite.
      if (socket.salonRole === "screen") broadcastScreens(code, io);
      // Le salon ferme quand plus aucun écran ni régie n'est connecté
      const rooms = io.sockets.adapter.rooms;
      const left =
        (rooms.get(`salon:screens:${code}`)?.size ?? 0) +
        (rooms.get(`salon:ctrl:${code}`)?.size ?? 0);
      if (left > 0) return;
      clearTimeout(salon._hostDcTimer);
      const idle =
        salon.game.paused ||
        salon.game.phase === "lobby" ||
        salon.game.phase === "gameover";
      salon._hostDcTimer = setTimeout(
        () => cleanupNow(code, io),
        idle ? HOST_IDLE_GRACE : HOST_RECONNECT_GRACE,
      );
    } else if (socket.salonRole === "player") {
      const username = socket.salonUsername;
      if (!username || !salon.players[username]) return;

      const player = salon.players[username];
      // Ce téléphone a déjà été remplacé par une reconnexion
      if (player.socketId !== socket.id) return;

      // During lobby: remove immediately (they can re-enter with same name)
      if (salon.game.phase === "lobby") {
        departPlayer(salon, username);
        broadcastRoster(code, io);
        return;
      }

      // En partie : score et état gardés le temps du délai de grâce
      player._disconnected = true;
      player.socketId = null;

      broadcastRoster(code, io);

      // Check if their absence unblocks round end
      checkEveryoneDone(code, io);

      player._dcTimer = setTimeout(() => {
        const s = salonRooms[code];
        if (!s?.players[username]) return;
        departPlayer(s, username);
        broadcastRoster(code, io);
      }, PLAYER_RECONNECT_GRACE);
    }
  });
}
