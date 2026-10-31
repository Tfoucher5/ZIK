import { alertAdminsSafe } from "../../services/admin/alerts.js";

// Panne vidéo (YouTube bloque le serveur, réseau coupé…) : après plusieurs
// échecs d'affilée, ce ne sont plus des titres injouables. Le 30/10, chaque
// échec consommait un titre de réserve et la partie se terminait seule en
// quelques secondes. Désormais la partie attend et réessaie, sans rien perdre.
export const OUTAGE_AFTER = 4;
const MAX_WAIT = 60;

export function holdForVideos(salon, io, retry) {
  const game = salon.game;
  // Le titre en échec repasse en fin de file : l'essai suivant en tente un autre
  if (game.currentTrack) {
    game.played = game.played.filter((t) => t !== game.currentTrack);
    game.sessionPlaylist.unshift(game.currentTrack);
  }
  const retryIn = Math.min(MAX_WAIT, 10 * (game.skipStreak - OUTAGE_AFTER + 1));
  if (!game.videoOutage)
    alertAdminsSafe(
      "admin_errors",
      {
        title: `Salon ${salon.code} : vidéos en panne`,
        body: "Les vidéos YouTube échouent en boucle, la partie attend et réessaie.",
        url: `/admin/salons?code=${salon.code}`,
        tag: `outage:${salon.code}`,
      },
      { throttleMs: 30 * 60 * 1000 },
    );
  game.videoOutage = true;
  io.to(`salon:${salon.code}`).emit("salon_video_outage", { retryIn });
  clearTimeout(game.outageTimer);
  const gen = game.gen;
  game.outageTimer = setTimeout(() => {
    game.outageTimer = null;
    if (game.gen === gen && game.videoOutage) retry();
  }, retryIn * 1000);
}

// Une musique joue de nouveau, la partie se termine ou repart de zéro
export function clearOutage(salon, io) {
  const game = salon.game;
  clearTimeout(game.outageTimer);
  game.outageTimer = null;
  if (!game.videoOutage) return;
  game.videoOutage = false;
  io.to(`salon:${salon.code}`).emit("salon_video_outage", { retryIn: null });
}
