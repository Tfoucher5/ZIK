import { FREE_MAX_PLAYERS } from "../../../data/proPlans.js";
import { verifyToken } from "../../middleware/auth.js";
import { alertAdminsSafe } from "../../services/admin/alerts.js";
import { getSalonNotice, salonRooms } from "../../state.js";
import {
  addPlayer,
  broadcastRoster,
  broadcastScreens,
  cleanUsername,
  getPlayerList,
  nightView,
  phoneLists,
  reconnectView,
  standings,
} from "./players.js";
import { nameTaken } from "./departed.js";
import { restoreSalon, resumeAfterRestart } from "./snapshot.js";
import { currentTrackInfo } from "./tracks.js";
import { announceNextVideo, prepareSession } from "./session.js";
import { supportView } from "./support.js";
import { eveningView } from "./evening.js";
import { scheduleCleanup, timerClock } from "./timers.js";
import { key, optional, safe, str } from "../safe.js";

// key absente (TV ouverte avec le seul code) : le handler répond « réservé à l'hôte »
const SCREEN_JOIN = { code: key(64), key: optional(str(200)) };
const PLAYER_JOIN = {
  code: key(64),
  username: str(100),
  token: optional(key(200)),
  auth: optional(str(8192)),
};

// Toujours envoyée, même vide : l'annonce a pu être retirée pendant une coupure
function sendNotice(socket) {
  socket.emit("salon_notice", { message: getSalonNotice() });
}

// Arrivées : écran TV, régie, joueurs (départs dans leave.js)
export function registerJoin(socket, io) {
  // ── Host connects to their salon ──────────────────────────────────────────
  // ── Écran TV : public avec le code, pilotable seulement avec la clé ──────
  safe(socket, "salon_join_host", SCREEN_JOIN, async ({ code, key }) => {
    if (!salonRooms[code]) await restoreSalon(code, io, socket);
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
      timerMax: salon.game.timerMax ?? salon.settings.roundDuration,
      ...timerClock(salon.game),
      support: supportView(salon),
    });
    sendNotice(socket);
    if (salon.game.phase === "lobby" && !salon.game.sessionPlaylist.length)
      prepareSession(code, io);
    else announceNextVideo(salon, io);
    scheduleCleanup(code);
    broadcastScreens(code, io);
    if (salon.game.restored) resumeAfterRestart(salon, io);
  });

  // ── Régie : l'écran de pilotage, à côté de la TV ─────────────────────────
  safe(socket, "salon_join_control", SCREEN_JOIN, async ({ code, key }) => {
    if (!salonRooms[code]) await restoreSalon(code, io, socket);
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
      ...timerClock(game),
      track:
        game.phase === "round" || game.phase === "summary"
          ? currentTrackInfo(salon)
          : null,
      history: game.history,
      trackCount: game.fullPlaylist.length,
      support: supportView(salon),
    });
    sendNotice(socket);
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

      if (!salonRooms[code]) await restoreSalon(code, io, socket);
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
        sendNotice(socket);
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
        ...phoneLists(salon, username),
      });
      sendNotice(socket);
      broadcastRoster(code, io);
      scheduleCleanup(code);
    },
  );
}
