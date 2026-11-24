import { SPECIALS } from "../../../data/salonOptions.js";
import { countdown, listenCountdowns } from "../countdown.js";
import { forgetSalon } from "../../../client/salonClient.js";

// Réactions de la régie aux événements du salon (état r : SalonRegie).
export function listenRegie(r, socket) {
  const chrono = countdown((v) => (r.timerVal = v));
  r.stopCountdowns = listenCountdowns(r, socket);
  socket.on("salon_server_restart", () => (r.restarting = true));
  // Pause ou fin de partie pendant l'annonce : plus de reprise à annoncer
  socket.on("salon_paused", () => (r.restored = null));
  socket.on("salon_game_over", () => (r.restored = null));
  socket.on("salon_restored", ({ resumeIn }) => {
    r.restored = { resumeIn };
    if (resumeIn == null) setTimeout(() => (r.restored = null), 4000);
  });
  socket.on("salon_control_joined", (d) => {
    const dormait = r.ready && !r.pro;
    r.restarting = false;
    r.ready = true;
    r.pro = d.pro;
    r.offre.onJoined(d.pro, dormait);
    r.error = "";
    r.settings = d.settings;
    r.reclaims = d.reclaims ?? [];
    r.mergeRoster(d.players);
    r.teams = d.teams;
    r.night = d.night;
    r.intermission = d.evening?.intermission ?? null;
    r.finale = d.evening?.finale ?? null;
    // Instantané d'avant le QR en grand : champ absent, donc fermé
    r.qrBig = !!d.evening?.qr;
    r.buzzer = d.buzzer;
    r.mediaCheck = d.mediaCheck;
    r.tvSound = d.tvSound ?? null;
    if (d.tvVolume != null) r.volume = d.tvVolume;
    r.phase = d.phase;
    r.paused = d.paused;
    r.round = d.currentRound;
    r.timerVal = d.timerVal;
    r.timerMax = d.timerMax;
    r.timerOn = d.timerActive;
    if (d.endsAt) chrono.start(d.endsAt, d.now);
    else chrono.stop();
    r.track = d.track;
    r.history = d.history;
    r.pickerIds = [...(d.settings.playlistIds || [])];
    r.chat.update(d.support);
  });

  socket.on("salon_roster", ({ players, teams }) => {
    r.mergeRoster(players);
    r.teams = teams;
  });
  socket.on("salon_settings", ({ settings }) => {
    r.settings = settings;
  });
  socket.on("salon_paused", ({ paused }) => {
    r.paused = paused;
    if (paused) chrono.stop();
  });
  socket.on("salon_game_starting", () => {
    r.phase = "starting";
    r.history = [];
  });
  socket.on("salon_buzzed", (buzzer) => {
    r.buzzer = buzzer;
  });
  socket.on("salon_media_check", (check) => {
    r.mediaCheck = check;
  });
  socket.on("salon_video_outage", ({ retryIn }) => {
    r.videoOutage = retryIn;
  });
  socket.on("salon_notice", ({ message }) => {
    r.adminNotice = message;
  });
  socket.on("salon_buzz_result", () => {
    r.buzzer = null;
  });
  socket.on("salon_evening", ({ intermission, finale, qr }) => {
    r.intermission = intermission;
    r.finale = finale;
    r.qrBig = !!qr;
  });
  socket.on("salon_round_end", () => chrono.stop());
  socket.on("salon_round_start", (d) => {
    r.restored = null;
    if (d.special) r.flash(`Manche spéciale : ${SPECIALS[d.special].label}`);
    r.buzzer = null;
    r.videoOutage = null;
    r.phase = "round";
    r.round = d.round;
    if (d.total) r.settings = { ...r.settings, rounds: d.total };
    r.track = d.hostInfo;
    r.timerOn = false;
    r.timerVal = 0;
    r.players = r.players.map((p) => ({
      ...p,
      foundThisRound: false,
      answeredThisRound: false,
    }));
  });
  socket.on("salon_timer_started", ({ max, endsAt, now }) => {
    r.timerVal = max;
    r.timerMax = max;
    r.timerOn = true;
    if (endsAt) chrono.start(endsAt, now);
  });
  socket.on("salon_timer_update", ({ max, endsAt, now }) => {
    chrono.start(endsAt, now);
    r.timerMax = max;
    r.timerOn = true;
  });
  socket.on("salon_player_answered", ({ username, correct, answered }) => {
    r.players = r.players.map((p) =>
      p.username === username
        ? {
            ...p,
            answeredThisRound: answered === true || p.answeredThisRound,
            foundThisRound: correct ?? p.foundThisRound,
          }
        : p,
    );
  });
  socket.on("salon_scores_update", ({ scores, teams }) => {
    r.applyScores(scores);
    if (teams) r.teams = teams;
  });
  socket.on("salon_short", ({ rounds }) => {
    r.settings = { ...r.settings, rounds };
    r.short = rounds;
  });
  socket.on("salon_round_end", (d) => {
    r.short = null;
    r.phase = "summary";
    r.timerOn = false;
    r.teams = d.teams;
    r.history = [...r.history, { answer: d.answer, cover: d.cover }];
    r.applyScores(d.scores);
  });
  socket.on("salon_replaced", ({ round, replaced }) => {
    r.history = r.history.map((h, i) =>
      i === round - 1 ? { ...h, replaced } : h,
    );
  });
  socket.on("salon_game_over", (d) => {
    r.phase = "gameover";
    r.teams = d.teams;
    r.night = d.night;
    r.track = null;
  });
  socket.on("salon_night", ({ night }) => {
    r.night = night;
  });
  // Le serveur enchaîne toujours sur le lancement (décompte ou non)
  socket.on("salon_restarted", ({ players }) => {
    r.mergeRoster(players);
    r.history = [];
    r.phase = "starting";
    r.round = 0;
    r.track = null;
  });
  socket.on(
    "salon_playlists_changed",
    ({ playlistIds, trackCount, appliedNow }) => {
      r.settings = { ...r.settings, playlistIds };
      r.flash(
        `Playlist changée (${trackCount} titres), ${appliedNow ? "dès la manche suivante" : "pour la prochaine partie"}.`,
      );
    },
  );
  socket.on("salon_screens", ({ count }) => {
    r.screens = count;
  });
  // Volume réel de la TV, réglé là-bas ou par une autre régie
  socket.on("salon_volume", ({ volume }) => (r.volume = volume));
  socket.on("salon_tv_sound", ({ ok }) => (r.tvSound = ok));
  socket.on("salon_reclaims", ({ usernames }) => (r.reclaims = usernames));
  // Soirée complète : l'offre est dans la page (RegiePro), pas par-dessus
  socket.on("salon_pro_required", ({ feature }) => {
    if (feature !== "players") r.upsell = feature;
  });
  socket.on("salon_queue", (d) => r.offre.onQueue(d));
  socket.on("salon_pro", ({ pro }) => {
    r.pro = pro;
    r.upsell = null;
    r.offre.onPro(pro);
  });
  socket.on("salon_closed", () => {
    forgetSalon(r.code);
    window.location.href = "/salon";
  });
  socket.on("salon_error", ({ message }) => {
    r.restarting = false;
    r.error = message;
  });
}
