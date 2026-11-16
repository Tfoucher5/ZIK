import { salonRooms } from "../../state.js";
import {
  adminSalon,
  broadcastRoster,
  nightView,
  requirePro,
  staff,
} from "./players.js";
import { bool, num, optional, safe } from "../safe.js";
import { emitSplit, phoneNight } from "./phoneView.js";

// Entre deux parties : entracte (pour tous), podium final de la soirée (Pro)
// et QR en grand (TV et régie seulement)
export function eveningView(salon) {
  return {
    intermission: salon.intermission ?? null,
    finale: salon.finale ? nightView(salon) : null,
    qr: !!salon.qrBig,
  };
}

const idle = (salon) => ["lobby", "gameover"].includes(salon.game.phase);
// Décompte, recherche du titre ou panne vidéo : la phase n'a pas encore changé
const launching = ({ game }) =>
  !!(game._starting || game._resolving || game.videoOutage);
const emit = (salon, io) => {
  const view = eveningView(salon);
  const finale = phoneNight(view.finale);
  emitSplit(io, salon.code, "salon_evening", view, (u) => ({
    intermission: view.intermission,
    finale: finale?.(u) ?? null,
  }));
};
const emitStaff = (salon, io) =>
  staff(salon.code, io).emit("salon_evening", eveningView(salon));

// Une partie qui démarre referme l'entracte, le podium et le QR
export function closeEvening(salon, io) {
  if (!salon.intermission && !salon.finale && !salon.qrBig) return;
  const phones = salon.intermission || salon.finale;
  salon.intermission = null;
  salon.finale = false;
  salon.qrBig = false;
  if (phones) emit(salon, io);
  else emitStaff(salon, io);
}

export function registerEvening(socket, io) {
  safe(socket, "salon_reset_night", {}, () => {
    const salon = adminSalon(socket);
    if (!salon || !requirePro(socket, salon, "night")) return;
    for (const p of Object.values(salon.players)) p.night = 0;
    for (const d of Object.values(salon.departed ?? {})) d.night = 0;
    salon.nightGames = 0;
    io.to(`salon:${salon.code}`).emit("salon_night", { night: null });
    closeEvening(salon, io);
  });

  // Durée facultative : l'heure de reprise est indicative, rien ne redémarre seul
  safe(
    socket,
    "salon_intermission",
    { minutes: optional(num(0, 120)) },
    ({ minutes }) => {
      const salon = adminSalon(socket);
      if (!salon || !idle(salon)) return;
      const m = Math.round(Number(minutes));
      salon.intermission = {
        until: m >= 1 && m <= 120 ? Date.now() + m * 60000 : null,
      };
      salon.finale = false;
      emit(salon, io);
    },
  );

  safe(socket, "salon_finale", {}, () => {
    const salon = adminSalon(socket);
    if (!salon || !idle(salon) || !requirePro(socket, salon, "night")) return;
    if (!salon.nightGames) return;
    salon.finale = true;
    salon.intermission = null;
    salon.qrBig = false;
    emit(salon, io);
  });

  safe(socket, "salon_evening_close", {}, () => {
    const salon = adminSalon(socket);
    if (salon) closeEvening(salon, io);
  });

  safe(socket, "salon_qr_big", { on: bool() }, ({ on }) => {
    const salon = adminSalon(socket);
    if (!salon || !!salon.qrBig === on) return;
    // Fermer reste toujours possible, même en pleine manche
    if (on && (!idle(salon) || launching(salon) || salon.finale)) return;
    salon.qrBig = on;
    emitStaff(salon, io);
  });

  // « Une autre ! » au podium : compté pour la TV et la régie, ne lance rien
  safe(socket, "salon_encore", { on: bool() }, ({ on }) => {
    if (socket.salonRole !== "player") return;
    const salon = salonRooms[socket.salonCode];
    const p = salon?.players[socket.salonUsername];
    if (!p || p.socketId !== socket.id) return;
    if (salon.game.phase !== "gameover" || launching(salon)) return;
    if (!!p.encore === on) return;
    p.encore = on;
    broadcastRoster(salon.code, io);
  });
}
