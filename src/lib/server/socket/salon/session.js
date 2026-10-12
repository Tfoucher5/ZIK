import { salonRooms } from "../../state.js";
import { buildSessionPlaylist, searchTrackVideo } from "./tracks.js";

// Cherche la vidéo du prochain titre et l'annonce à l'hôte, qui la met en
// mémoire tampon pendant la manche en cours : sur une connexion lente, la
// manche suivante démarre sans attendre le réseau.
export function prefetchNextVideo(code, io) {
  const salon = salonRooms[code];
  const game = salon.game;
  const nextTrack = game.sessionPlaylist[game.sessionPlaylist.length - 1];
  if (!nextTrack) return;
  const gen = (game._prefetchGen = (game._prefetchGen ?? 0) + 1);
  game._prefetchPromise = searchTrackVideo(
    nextTrack,
    salon.settings.roundDuration,
  )
    .then((r) => {
      if (game._prefetchGen !== gen) return;
      game.prefetchedRound = { track: nextTrack, ...r };
      // Déjà sorti de la pile : la manche démarre avec, rien à précharger
      if (game.sessionPlaylist.at(-1) === nextTrack)
        announceNextVideo(salon, io);
    })
    .catch(() => {});
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
  prefetchNextVideo(code, io);
}
