import { salonRooms } from "../../state.js";
import { note } from "./journal.js";
import { buildSessionPlaylist } from "./tracks.js";
import { checkSession, findVideo, previewUrl } from "./media.js";

// Cherche la vidéo du prochain titre et l'annonce à l'hôte, qui la met en
// mémoire tampon pendant la manche en cours : sur une connexion lente, la
// manche suivante démarre sans attendre le réseau.
export function prefetchNextVideo(code, io) {
  const salon = salonRooms[code];
  const game = salon.game;
  const nextTrack = game.sessionPlaylist[game.sessionPlaylist.length - 1];
  if (!nextTrack) return;
  findVideo(salon, nextTrack)
    .then((r) => {
      game.prefetchedRound = { track: nextTrack, ...r };
      // Déjà sorti de la pile : la manche démarre avec, rien à précharger
      if (game.sessionPlaylist.at(-1) === nextTrack)
        announceNextVideo(salon, io);
    })
    .catch(() => {
      // Sans vidéo : l'extrait est prêt avant la manche, rien à annoncer à la TV
      game.prefetchedRound = null;
      return previewUrl(nextTrack).catch(() => {});
    });
}

export function announceNextVideo(salon, io) {
  const next = salon.game.prefetchedRound;
  if (!next) return;
  io.to(`salon:screens:${salon.code}`).emit("salon_next_video", {
    videoId: next.video.id,
    startSeconds: next.safeStart,
  });
}

// Tirage des titres dès le lobby (et au podium, pour la revanche) : la vidéo
// de la première manche est prête avant le clic sur « Lancer ».
export function prepareSession(code, io) {
  const salon = salonRooms[code];
  salon.game.sessionPlaylist = buildSessionPlaylist(
    salon.game.fullPlaylist,
    salon.settings.maxRounds,
  );
  salon.game.prefetchedRound = null;
  salon.game.played = [];
  salon.game.skipStreak = 0;
  prefetchNextVideo(code, io);
  // Le vrai total change avec la nouvelle pile, puis avec les introuvables
  const announce = () => {
    if (salonRooms[code] === salon)
      io?.to(`salon:${code}`).emit("salon_settings", {
        settings: settingsView(salon),
      });
  };
  announce();
  checkSession(salon, io).then(announce, () => {});
}

// Manches réellement jouées : jamais plus que de titres. Le choix de
// l'organisateur (maxRounds) reste mémorisé et revient si la sélection grandit.
export function roundsTotal(salon) {
  const g = salon.game;
  const left = g.sessionPlaylist?.length ?? 0;
  if (g.phase === "lobby" && !left) return salon.settings.maxRounds;
  const done = ["lobby", "gameover"].includes(g.phase) ? 0 : g.currentRound;
  // Introuvables encore dans la pile qu'aucune réserve ne remplacera
  const dead = new Set(g.mediaCheck?.dead ?? []);
  const deadLeft = dead.size
    ? g.sessionPlaylist.filter((t) => dead.has(t.id)).length
    : 0;
  const spares = (g.fullPlaylist?.length ?? 0) - left - (g.played?.length ?? 0);
  const lost = Math.max(0, deadLeft - Math.max(0, spares));
  return Math.min(salon.settings.maxRounds, done + left - lost);
}

export const settingsView = (salon) => ({
  ...salon.settings,
  rounds: roundsTotal(salon),
});

// Remplaçant d'un titre injouable, de préférence de la même playlist. Glissé
// sous la pile : le titre suivant, déjà préchargé, reste le prochain. Faux
// sans réserve : la partie perd une manche.
export function drawSpareTrack(game, failed) {
  const used = new Set([...game.played, ...game.sessionPlaylist]);
  const spares = game.fullPlaylist.filter((t) => !used.has(t));
  const same = spares.filter((t) => t.playlistId === failed?.playlistId);
  const pool = same.length ? same : spares;
  if (pool.length)
    game.sessionPlaylist.unshift(pool[Math.floor(Math.random() * pool.length)]);
  return pool.length > 0;
}

// Titre injouable sans réserve (le journal a déjà noté le titre passé) : la
// régie le dit, la TV et les téléphones voient le compteur à la manche suivante
export function shortOfTracks(salon, io) {
  const rounds = roundsTotal(salon);
  note(
    salon,
    `Plus de titre en réserve : la partie fera ${rounds} manche${rounds > 1 ? "s" : ""}.`,
  );
  io.to(`salon:ctrl:${salon.code}`).emit("salon_short", { rounds });
}
