import { salonRooms } from "../../state.js";
import { broadcastRoster, broadcastScreens } from "./players.js";
import { checkEveryoneDone } from "./rounds.js";
import { departPlayer } from "./departed.js";
import { cleanupNow } from "./timers.js";
import { safe } from "../safe.js";

// Large : un PC de bar qui se met en veille ou un onglet rechargé ne doit pas
// fermer la soirée
const HOST_RECONNECT_GRACE = 10 * 60 * 1000; // 10 min
// Entre deux parties ou en pause : l'ordi de la TV peut se mettre en veille
// pendant l'entracte sans que la soirée soit perdue
const HOST_IDLE_GRACE = 2 * 60 * 60 * 1000; // 2 h
// Un téléphone verrouillé le temps d'un passage au comptoir garde sa place
const PLAYER_RECONNECT_GRACE = 10 * 60 * 1000; // 10 min

// Joueur hors ligne : sa place l'attend le temps du délai de grâce
export function scheduleDeparture(salon, username, io) {
  const player = salon.players[username];
  player._disconnected = true;
  player.socketId = null;
  clearTimeout(player._dcTimer);
  player._dcTimer = setTimeout(() => {
    const s = salonRooms[salon.code];
    if (s?.players[username] !== player) return;
    departPlayer(s, username);
    broadcastRoster(salon.code, io);
  }, PLAYER_RECONNECT_GRACE);
}

// Départs : écran TV, régie, joueurs
export function registerLeave(socket, io) {
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
      const player = username && salon.players[username];
      // Ce téléphone a déjà été remplacé par une reconnexion
      if (!player || player.socketId !== socket.id) return;

      // Dans le lobby : retiré tout de suite, il peut revenir avec le même pseudo
      if (salon.game.phase === "lobby") {
        departPlayer(salon, username);
        broadcastRoster(code, io);
        return;
      }

      // En partie : score et état gardés le temps du délai de grâce
      scheduleDeparture(salon, username, io);
      broadcastRoster(code, io);
      // Son absence peut suffire à clore la manche
      checkEveryoneDone(code, io);
    }
  });
}
