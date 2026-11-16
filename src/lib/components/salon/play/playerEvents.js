import { countdown, listenCountdowns } from "../countdown.js";
import { listenJoin } from "./playerJoin.js";
import { listenRound } from "./playerRound.js";

// Réactions du téléphone joueur aux événements du salon (état p : SalonPlayer).
export function listenPlayer(p, socket, c, u) {
  const chrono = countdown((v) => (p.timerVal = v));
  p.stopCountdowns = listenCountdowns(p, socket);
  listenJoin(p, socket, chrono, c, u);
  // Pause ou fin de partie pendant l'annonce : plus de reprise à annoncer
  socket.on("salon_paused", () => (p.restored = null));
  socket.on("salon_game_over", () => (p.restored = null));
  socket.on("salon_restored", ({ resumeIn }) => {
    p.restored = { resumeIn };
    if (resumeIn == null) setTimeout(() => (p.restored = null), 4000);
  });

  const resetScores = () => {
    p.ranking = null;
    p.myScore = 0;
    p.finalRanking = null;
    p.encore = false;
  };
  socket.on("salon_game_starting", () => {
    p.phase = "starting";
    p.teamOpen = false;
    resetScores();
  });
  // Rejouer : la phase reste « gameover » jusqu'à la manche 1, sans résultat à montrer
  socket.on("salon_restarted", () => {
    resetScores();
    p.replaying = true;
  });

  socket.on("salon_roster", ({ roster, teams, team, encore }) => {
    p.roster = roster;
    p.teams = teams;
    p.myTeam = team ?? p.myTeam;
    p.encore = !!encore;
  });
  socket.on("salon_video_outage", ({ retryIn }) => {
    p.videoOutage = retryIn;
  });
  socket.on("salon_notice", ({ message }) => {
    p.adminNotice = message;
  });
  socket.on("salon_evening", ({ intermission, finale }) => {
    p.intermission = intermission;
    p.finale = finale;
  });
  socket.on("salon_paused", ({ paused }) => {
    p.paused = paused;
    if (paused) chrono.stop();
  });
  socket.on("salon_settings", ({ settings }) => {
    p.total = settings.maxRounds;
    p.answerMode = settings.answerMode;
  });
  socket.on("salon_kicked", () => {
    socket.disconnect();
    p.joined = false;
    p.joinError = "L'hôte t'a retiré du salon.";
  });

  listenRound(p, socket, chrono);

  socket.on("salon_game_over", ({ ranking, teams, night }) => {
    p.phase = "gameover";
    p.replaying = false;
    p.finalRanking = ranking;
    p.teams = teams;
    p.night = night;
  });
  socket.on("salon_night", ({ night }) => {
    p.night = night;
  });

  // Soirée fermée : retour au formulaire avec le message, plus de reprise
  socket.on("salon_closed", ({ message }) => {
    p.leave();
    p.waiting = false;
    p.restarting = false;
    p.joinError = message;
  });

  socket.on("salon_error", ({ message }) => {
    p.joining = false;
    p.restarting = false;
    if (!p.joined) {
      // Soirée fermée, pseudo refusé ou file pleine : retour au formulaire, pseudo gardé
      p.waiting = false;
      p.resume = null;
      p.nameTaken = null;
      p.reclaimPending = false;
      p.joinError = message;
      socket.disconnect();
      return;
    }
    // Erreur en pleine partie : affichée un instant
    p.error = message;
    clearTimeout(p.errorTimer);
    p.errorTimer = setTimeout(() => {
      p.error = "";
    }, 6000);
  });
}
