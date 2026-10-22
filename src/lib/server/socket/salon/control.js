import { reportTrackIssue } from "../../services/music/trackIssues.js";
import { salonRooms } from "../../state.js";
import { recordSalonGameStart } from "./persist.js";
import {
  adminSalon,
  broadcastRoster,
  getPlayerList,
  kickPlayer,
  requirePro,
  resetStats,
  sortedScores,
  standings,
} from "./players.js";
import { applySettings } from "./rooms.js";
import {
  finishGame,
  nextRound,
  revealRound,
  startNextRound,
} from "./rounds.js";
import { prepareSession } from "./session.js";
import { cleanTeamName } from "./teams.js";
import { clearPause, pauseGame, resumeGame, startTimer } from "./timers.js";
// Régie (et écran ouvert avec la clé) : pilotage de la partie
export function registerControl(socket, io) {
  socket.on("salon_pause", () => {
    const salon = adminSalon(socket);
    if (salon) pauseGame(salon.code, io);
  });

  socket.on("salon_resume", () => {
    const salon = adminSalon(socket);
    if (salon) resumeGame(salon.code, io);
  });

  // Révéler tout de suite, sans attendre la fin du chrono
  socket.on("salon_reveal", () => {
    const salon = adminSalon(socket);
    if (!salon || salon.game.phase !== "round") return;
    if (!requirePro(socket, salon, "reveal")) return;
    revealRound(salon.code, "Réponse révélée", io);
  });

  socket.on("salon_end_game", () => {
    const salon = adminSalon(socket);
    if (!salon || !["round", "summary"].includes(salon.game.phase)) return;
    if (!requirePro(socket, salon, "endGame")) return;
    finishGame(salon.code, io);
  });

  socket.on("salon_volume", ({ volume } = {}) => {
    const salon = adminSalon(socket);
    if (!salon || !requirePro(socket, salon, "volume")) return;
    const v = Math.min(Math.max(Math.round(Number(volume) || 0), 0), 100);
    io.to(`salon:screens:${salon.code}`).emit("salon_volume", { volume: v });
  });

  socket.on("salon_kick", ({ username } = {}) => {
    const salon = adminSalon(socket);
    if (salon) kickPlayer(salon, username, io);
  });

  // Correction à la main par l'animateur (réponse orale acceptée, triche…)
  // `delta` ajuste au pas (boutons + et −) ; `score` fixe une valeur saisie
  // directement, hors de portée d'un delta plafonné à 1000.
  socket.on("salon_adjust_score", ({ username, delta, score } = {}) => {
    const salon = adminSalon(socket);
    const player = salon?.players[username];
    if (!player) return;

    const absolu = score != null;
    const v = Math.round(Number(absolu ? score : delta) || 0);
    if (absolu) {
      if (!Number.isFinite(v) || v < 0 || v > 100000) return;
    } else if (!v || Math.abs(v) > 1000) return;

    if (!requirePro(socket, salon, "score")) return;
    player.score = absolu ? v : Math.max(0, player.score + v);
    io.to(`salon:${salon.code}`).emit("salon_scores_update", {
      scores: sortedScores(salon),
      teams: standings(salon),
    });
    broadcastRoster(salon.code, io);
  });

  socket.on("salon_update_settings", (patch = {}) => {
    const salon = adminSalon(socket);
    if (salon)
      applySettings(salon.code, patch, io, (f) => requirePro(socket, salon, f));
  });

  socket.on("salon_rename_team", ({ team, name } = {}) => {
    const salon = adminSalon(socket);
    const t = salon?.settings.teams?.find((x) => x.id === team);
    const n = cleanTeamName(name);
    if (!t || !n || !requirePro(socket, salon, "teamEdit")) return;
    t.name = n;
    broadcastRoster(salon.code, io);
  });

  socket.on("salon_set_player_team", ({ username, team } = {}) => {
    const salon = adminSalon(socket);
    const player = salon?.players[username];
    if (!player || !salon.settings.teams?.some((t) => t.id === team)) return;
    if (!requirePro(socket, salon, "teamEdit")) return;
    player.team = team;
    broadcastRoster(salon.code, io);
  });

  // ── Host starts the game ──────────────────────────────────────────────────
  socket.on("salon_start", () => {
    const salon = adminSalon(socket);
    if (!salon || salon.game.phase !== "lobby") return;
    const code = salon.code;

    if (!salon.game.sessionPlaylist.length) prepareSession(code, io);
    salon.game.currentRound = 0;
    salon.game.history = [];
    resetStats(salon);
    broadcastRoster(code, io);

    io.to(`salon:${code}`).emit("salon_game_starting");
    recordSalonGameStart(salon);
    startNextRound(code, io);
  });

  // ── Host signals music has started playing ────────────────────────────────
  socket.on("salon_music_ready", () => {
    if (socket.salonRole !== "screen") return;
    const code = socket.salonCode;
    const salon = salonRooms[code];
    if (
      !salon ||
      salon.game.phase !== "round" ||
      salon.game.timerActive ||
      salon.game.paused
    )
      return;
    startTimer(code, io);
  });

  // ── Host triggers next round (manual mode) ────────────────────────────────
  socket.on("salon_next_round", () => {
    const salon = adminSalon(socket);
    if (!salon || salon.game.phase !== "summary") return;
    nextRound(salon.code, io);
  });

  // La régie signale une vidéo fausse ou mal calée : elle part dans la file
  // « Réparer » de l'admin avec la vidéo exacte qui passait.
  socket.on("salon_report_video", ({ reason } = {}) => {
    const salon = adminSalon(socket);
    const track = salon?.game.currentTrack;
    if (!track || !["round", "summary"].includes(salon.game.phase)) return;
    reportTrackIssue(
      track.id,
      "video",
      "host",
      String(reason ?? "").slice(0, 200) || null,
      {
        salon: salon.code,
        videoId: salon.game.currentVideo?.id ?? null,
        start: salon.game.currentVideo?.start ?? null,
      },
    );
  });

  // ── Host restarts the game with same players ──────────────────────────────
  socket.on("salon_restart", () => {
    const salon = adminSalon(socket);
    if (!salon) return;
    const code = salon.code;
    if (salon.game.phase !== "gameover" && salon.game.phase !== "summary")
      return;
    clearPause(code, io);

    // Clear any pending timers
    clearInterval(salon.game.interval);
    clearTimeout(salon.game.breakTimer);
    salon.game.interval = null;
    salon.game.breakTimer = null;

    resetStats(salon);
    broadcastRoster(code, io);
    for (const p of Object.values(salon.players)) {
      p.foundArtist = false;
      p.foundTitle = false;
      p.foundFeats = [];
      p.foundExtras = [];
      p._fullFoundCounted = false;
    }

    // Au podium, les titres de la revanche sont déjà tirés et préchargés
    if (salon.game.phase === "summary") prepareSession(code, io);
    salon.game.currentRound = 0;
    salon.game.history = [];
    salon.game.firstFinder = null;
    salon.game.currentTrack = null;

    io.to(`salon:${code}`).emit("salon_restarted", {
      players: getPlayerList(salon),
    });
    recordSalonGameStart(salon);
    startNextRound(code, io);
  });
}
