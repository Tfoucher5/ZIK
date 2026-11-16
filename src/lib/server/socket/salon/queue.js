import { randomBytes } from "crypto";
import { FREE_MAX_PLAYERS } from "../../../data/proPlans.js";
import { alertAdminsSafe } from "../../services/admin/alerts.js";
import { salonRooms } from "../../state.js";
import { note } from "./journal.js";
import { joinPlayer } from "./join.js";
import { PLAYER_RECONNECT_GRACE } from "./leave.js";

// File des joueurs refusés par la limite gratuite (salon.waiting) : ils entrent
// dans l'ordre d'arrivée dès qu'une place se libère. En attendant, ils ne sont
// dans aucune salle du salon et ne reçoivent rien de la partie.
const MAX_WAITING = 200;
// shortcut: une entrée relue d'un instantané (sans leftAt) est comptée absente depuis le démarrage du process, à revoir si les redémarrages durent plus que le délai de grâce
const BOOT = Date.now();

export const isFull = (salon) =>
  !salon.pro && Object.keys(salon.players).length >= FREE_MAX_PLAYERS;

const waitRoom = (code) => `salon:wait:${code}`;
const socketOf = (io, w) => w.socketId && io.sockets.sockets.get(w.socketId);

function purge(salon, io) {
  salon.waiting = salon.waiting.filter(
    (w) =>
      socketOf(io, w) ||
      Date.now() - (w.leftAt ?? BOOT) <= PLAYER_RECONNECT_GRACE,
  );
}

function enqueue(salon, socket, entry) {
  entry.socketId = socket.id;
  delete entry.leftAt;
  socket.salonWait = salon.code;
  socket.join(waitRoom(salon.code));
  socket.emit("salon_waiting", {
    username: entry.username,
    token: entry.token,
  });
}

// Salon complet : le joueur est refusé, ou mis en file s'il l'a demandé (wait)
export function refuse(salon, socket, io, { username, token, userId, wait }) {
  const { code } = salon;
  if (salon.waiting) purge(salon, io);
  const queue = salon.waiting ?? [];
  // Retour d'un téléphone déjà en file : il garde son rang
  const mine = queue.find(
    (w) => (token && w.token === token) || w.socketId === socket.id,
  );
  if (mine) return enqueue(salon, socket, mine);
  if (wait && queue.some((w) => w.username === username))
    return socket.emit("salon_error", { message: "Ce pseudo est déjà pris." });

  salon.limitHits = (salon.limitHits ?? 0) + 1;
  note(salon, `${username} refusé : limite gratuite atteinte`);
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
  if (!wait || queue.length >= MAX_WAITING)
    return socket.emit("salon_error", { message: "Le salon est complet." });

  const entry = {
    username,
    token: token ?? randomBytes(12).toString("base64url"),
    userId: userId ?? null,
  };
  (salon.waiting ??= []).push(entry);
  enqueue(salon, socket, entry);
}

// Sortie de la file : admis, placé directement ou parti de lui-même
export function unqueue(salon, socket, token = null) {
  if (salon?.waiting)
    salon.waiting = salon.waiting.filter(
      (w) => w.socketId !== socket.id && !(token && w.token === token),
    );
  if (socket.salonWait) socket.leave(waitRoom(socket.salonWait));
  socket.salonWait = null;
}

// Téléphone en file coupé : sa place l'attend le temps du délai de grâce
export function leaveQueue(socket) {
  const w = salonRooms[socket.salonWait]?.waiting?.find(
    (w) => w.socketId === socket.id,
  );
  if (w) Object.assign(w, { socketId: null, leftAt: Date.now() });
}

// Une place libérée : les premiers connectés de la file entrent, les absents
// gardent leur rang. Appelé hors safe(), d'où les try/catch.
export function admitWaiting(salon, io) {
  try {
    if (!io || !salon?.waiting) return;
    purge(salon, io);
    for (const w of [...salon.waiting]) {
      if (isFull(salon)) break;
      const socket = socketOf(io, w);
      // Déjà entré dans un salon entre-temps
      if (!socket || socket.salonCode) continue;
      try {
        unqueue(salon, socket, w.token);
        joinPlayer(io, salon, socket, { ...w, wait: false });
      } catch (err) {
        console.error("[salon] file d'attente", err?.stack ?? err);
      }
    }
    if (salon.pro || !salon.waiting.length) delete salon.waiting;
  } catch (err) {
    console.error("[salon] file d'attente", err?.stack ?? err);
  }
}
