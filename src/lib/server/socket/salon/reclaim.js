// Joueur revenu sans son jeton (autre navigateur, stockage effacé, navigation
// privée) : son pseudo est gardé pour lui. Il demande sa place, l'hôte confirme
// sur la régie que c'est bien lui, et son téléphone reçoit le jeton du joueur.

import { salonRooms } from "../../state.js";
import { nameTaken } from "./departed.js";
import { adminSalon, cleanUsername } from "./players.js";
import { note } from "./journal.js";
import { bool, key, safe, str } from "../safe.js";

// Demandes en attente : salon._reclaims[pseudo] = id du socket qui la fait
export function pendingReclaims(salon) {
  return Object.keys(salon._reclaims ?? {});
}

export function registerReclaim(socket, io) {
  safe(
    socket,
    "salon_reclaim_request",
    { code: key(64), username: str(100) },
    ({ code, username }) => {
      username = cleanUsername(username);
      if (!username || username in Object.prototype) return;
      const salon = salonRooms[code];
      const owner = salon && nameTaken(salon, username);
      if (!owner || salon.banned.has(username.toLowerCase()))
        return socket.emit("salon_error", {
          message:
            "Ce pseudo n'est plus dans la soirée. Rejoins avec ton pseudo.",
        });
      (salon._reclaims ??= {})[username] = socket.id;
      note(salon, `${username} demande à reprendre sa place`);
      socket.emit("salon_reclaim_pending", { username });
      io.to(`salon:ctrl:${code}`).emit("salon_reclaims", {
        usernames: pendingReclaims(salon),
      });
    },
  );

  safe(
    socket,
    "salon_reclaim_answer",
    { username: key(20), accept: bool() },
    ({ username, accept }) => {
      const salon = adminSalon(socket);
      const sid = salon?._reclaims?.[username];
      if (!sid) return;
      delete salon._reclaims[username];
      io.to(`salon:ctrl:${salon.code}`).emit("salon_reclaims", {
        usernames: pendingReclaims(salon),
      });
      const target = io.sockets.sockets.get(sid);
      const owner = nameTaken(salon, username);
      if (!target) return;
      if (!accept || !owner)
        return target.emit("salon_error", {
          message: "L'hôte n'a pas confirmé. Choisis un autre pseudo.",
        });
      note(salon, `Place de ${username} rendue par l'hôte`);
      target.emit("salon_reclaim_ok", { token: owner.token });
    },
  );
}
