import { adminSalon, requirePro } from "./players.js";
import { bool, num, safe } from "../safe.js";

const clamp = (v) => Math.min(Math.max(Math.round(Number(v) || 0), 0), 100);

// Volume de la TV, vu partout : la TV le règle librement (réglage de l'écran),
// la régie le pilote à distance en Pro. Gardé en mémoire, hors instantané.
export function registerVolume(socket, io) {
  safe(socket, "salon_volume", { volume: num(0, 100) }, ({ volume }) => {
    const salon = adminSalon(socket);
    if (!salon || !requirePro(socket, salon, "volume")) return;
    salon._tvVolume = clamp(volume);
    io.to([`salon:screens:${salon.code}`, `salon:ctrl:${salon.code}`]).emit(
      "salon_volume",
      { volume: salon._tvVolume },
    );
  });

  safe(socket, "salon_tv_volume", { volume: num(0, 100) }, ({ volume }) => {
    const salon = adminSalon(socket);
    if (!salon || socket.salonRole !== "screen") return;
    salon._tvVolume = clamp(volume);
    io.to(`salon:ctrl:${salon.code}`).emit("salon_volume", {
      volume: salon._tvVolume,
    });
  });

  // Son de la TV testé : indicatif pour la régie, ne bloque jamais le lancement.
  safe(socket, "salon_tv_sound", { ok: bool() }, ({ ok }) => {
    const salon = adminSalon(socket);
    if (!salon || socket.salonRole !== "screen") return;
    salon._tvSound = ok;
    io.to(`salon:ctrl:${salon.code}`).emit("salon_tv_sound", { ok });
  });
}
