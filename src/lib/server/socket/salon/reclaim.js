// Joueur revenu sans son jeton (autre navigateur, stockage effacé, navigation
// privée) : son pseudo est gardé pour lui. Il demande sa place, l'hôte confirme
// sur la régie que c'est bien lui, et son téléphone reçoit un nouveau jeton :
// l'ancien appareil ne peut plus reprendre la place.

import { randomBytes } from "crypto";
import { salonRooms } from "../../state.js";
import { nameTaken } from "./departed.js";
import { adminSalon, cleanUsername } from "./players.js";
import { note } from "./journal.js";
import { saveSnapshot } from "./snapshot.js";
import { bool, key, safe, str } from "../safe.js";

// Au-delà, la régie déborde de lignes à confirmer
const MAX_PENDING = 5;

// Demandes en attente : salon._reclaims[pseudo] = id du socket qui la fait
export function pendingReclaims(salon) {
  return Object.keys(salon._reclaims ?? {});
}

function sendPending(salon, io) {
  io.to(`salon:ctrl:${salon.code}`).emit("salon_reclaims", {
    usernames: pendingReclaims(salon),
  });
}

// Le joueur est revenu avec son jeton, ou le téléphone qui demandait est parti
export function dropReclaim(salon, username, io) {
  if (!salon._reclaims?.[username]) return;
  delete salon._reclaims[username];
  sendPending(salon, io);
}

// Nouveau jeton pour ce joueur, qu'il soit encore là ou déjà parti
function renewToken(salon, owner) {
  const old = owner.token;
  owner.token = randomBytes(12).toString("base64url");
  if (salon.departed?.[old] === owner) {
    delete salon.departed[old];
    salon.departed[owner.token] = owner;
  }
  return owner.token;
}

export function registerReclaim(socket, io) {
  safe(
    socket,
    "salon_reclaim_request",
    { code: key(64), username: str(100) },
    ({ code, username }) => {
      // Un téléphone = une seule demande : la précédente est retirée
      dropReclaimOf(socket, io);
      username = cleanUsername(username);
      if (!username || username in Object.prototype) return;
      const salon = salonRooms[code];
      const owner = salon && nameTaken(salon, username);
      if (!owner || salon.banned.has(username.toLowerCase()))
        return socket.emit("salon_error", {
          message:
            "Ce pseudo n'est plus dans la soirée. Rejoins avec ton pseudo.",
        });
      const waiting = salon._reclaims?.[username];
      // Une seule demande à la fois : l'hôte ne doit pas confirmer à l'aveugle
      // pour un autre téléphone que celui qu'il a en face de lui
      if (waiting && waiting !== socket.id)
        return socket.emit("salon_error", {
          message:
            "Quelqu'un attend déjà de reprendre ce pseudo. Choisis-en un autre ou va voir l'hôte.",
        });
      if (pendingReclaims(salon).length >= MAX_PENDING)
        return socket.emit("salon_error", {
          message:
            "L'hôte a déjà plusieurs demandes à confirmer. Réessaie dans un instant.",
        });
      (salon._reclaims ??= {})[username] = socket.id;
      socket.reclaimFor = { code, username };
      note(salon, `${username} demande à reprendre sa place`);
      socket.emit("salon_reclaim_pending", { username });
      sendPending(salon, io);
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
      dropReclaim(salon, username, io);
      const target = io.sockets.sockets.get(sid);
      const owner = nameTaken(salon, username);
      if (!target) return;
      target.reclaimFor = null;
      if (!accept || !owner)
        return target.emit("salon_error", {
          message: "L'hôte n'a pas confirmé. Choisis un autre pseudo.",
        });
      note(salon, `Place de ${username} rendue par l'hôte`);
      target.emit("salon_reclaim_ok", { token: renewToken(salon, owner) });
      // Sinon, après une reprise depuis l'instantané, l'ancien jeton revit
      saveSnapshot(salon);
    },
  );
}

// Téléphone parti pendant sa demande : la ligne disparaît de la régie (appelé par leave.js)
export function dropReclaimOf(socket, io) {
  const r = socket.reclaimFor;
  const salon = r && salonRooms[r.code];
  if (salon?._reclaims?.[r.username] === socket.id)
    dropReclaim(salon, r.username, io);
}
