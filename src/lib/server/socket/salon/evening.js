import { adminSalon, nightView, requirePro } from "./players.js";

// Entre deux parties : entracte (pour tous) et podium final de la soirée (Pro)
export function eveningView(salon) {
  return {
    intermission: salon.intermission ?? null,
    finale: salon.finale ? nightView(salon) : null,
  };
}

const idle = (salon) => ["lobby", "gameover"].includes(salon.game.phase);
const emit = (salon, io) =>
  io.to(`salon:${salon.code}`).emit("salon_evening", eveningView(salon));

// Une partie qui démarre referme l'entracte et le podium
export function closeEvening(salon, io) {
  if (!salon.intermission && !salon.finale) return;
  salon.intermission = null;
  salon.finale = false;
  emit(salon, io);
}

export function registerEvening(socket, io) {
  socket.on("salon_reset_night", () => {
    const salon = adminSalon(socket);
    if (!salon || !requirePro(socket, salon, "night")) return;
    for (const p of Object.values(salon.players)) p.night = 0;
    salon.nightGames = 0;
    salon.nightBank = {};
    io.to(`salon:${salon.code}`).emit("salon_night", { night: null });
    closeEvening(salon, io);
  });

  // Durée facultative : l'heure de reprise est indicative, rien ne redémarre seul
  socket.on("salon_intermission", ({ minutes } = {}) => {
    const salon = adminSalon(socket);
    if (!salon || !idle(salon)) return;
    const m = Math.round(Number(minutes));
    salon.intermission = {
      until: m >= 1 && m <= 120 ? Date.now() + m * 60000 : null,
    };
    salon.finale = false;
    emit(salon, io);
  });

  socket.on("salon_finale", () => {
    const salon = adminSalon(socket);
    if (!salon || !idle(salon) || !requirePro(socket, salon, "night")) return;
    if (!salon.nightGames) return;
    salon.finale = true;
    salon.intermission = null;
    emit(salon, io);
  });

  socket.on("salon_evening_close", () => {
    const salon = adminSalon(socket);
    if (salon) closeEvening(salon, io);
  });
}
