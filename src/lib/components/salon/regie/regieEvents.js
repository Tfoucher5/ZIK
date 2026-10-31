import { SPECIALS } from "../../../data/salonOptions.js";

// Réactions de la régie aux événements du salon (état r : SalonRegie).
export function listenRegie(r, socket) {
  socket.on("salon_control_joined", (d) => {
    r.ready = true;
    r.pro = d.pro;
    r.error = "";
    r.settings = d.settings;
    r.mergeRoster(d.players);
    r.teams = d.teams;
    r.night = d.night;
    r.intermission = d.evening?.intermission ?? null;
    r.finale = d.evening?.finale ?? null;
    r.buzzer = d.buzzer;
    r.mediaCheck = d.mediaCheck;
    r.phase = d.phase;
    if (d.phase === "gameover") r.onglet = "reglages";
    r.paused = d.paused;
    r.round = d.currentRound;
    r.timerVal = d.timerVal;
    r.timerMax = d.timerMax;
    r.timerOn = d.timerActive;
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
  socket.on("salon_buzz_result", () => {
    r.buzzer = null;
  });
  socket.on("salon_evening", ({ intermission, finale }) => {
    r.intermission = intermission;
    r.finale = finale;
  });
  socket.on("salon_round_start", (d) => {
    if (d.special) r.flash(`Manche spéciale : ${SPECIALS[d.special].label}`);
    r.buzzer = null;
    r.videoOutage = null;
    r.phase = "round";
    r.round = d.round;
    r.track = d.hostInfo;
    r.timerOn = false;
    r.timerVal = 0;
    r.players = r.players.map((p) => ({
      ...p,
      foundThisRound: false,
      answeredThisRound: false,
    }));
  });
  socket.on("salon_timer_started", ({ max }) => {
    r.timerVal = max;
    r.timerMax = max;
    r.timerOn = true;
  });
  socket.on("salon_timer_update", ({ current, max }) => {
    r.timerVal = current;
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
  socket.on("salon_round_end", (d) => {
    r.phase = "summary";
    r.timerOn = false;
    r.teams = d.teams;
    r.history = [...r.history, { answer: d.answer, cover: d.cover }];
    r.applyScores(d.scores);
  });
  socket.on("salon_game_over", (d) => {
    r.phase = "gameover";
    r.teams = d.teams;
    r.night = d.night;
    r.track = null;
    // La suite de la soirée se prépare d'ici : playlist, mode, manches
    r.onglet = "reglages";
  });
  socket.on("salon_night", ({ night }) => {
    r.night = night;
  });
  socket.on("salon_restarted", ({ players }) => {
    r.mergeRoster(players);
    r.history = [];
  });
  socket.on("salon_playlists_changed", ({ trackCount, appliedNow }) =>
    r.flash(
      `Playlist changée (${trackCount} titres), ${appliedNow ? "dès la manche suivante" : "pour la prochaine partie"}.`,
    ),
  );
  socket.on("salon_screens", ({ count }) => {
    r.screens = count;
  });
  socket.on("salon_pro_required", ({ feature }) => {
    r.upsell = feature;
  });
  socket.on("salon_pro", ({ pro }) => {
    r.pro = pro;
    r.upsell = null;
    r.flash("ZIK Pro activé pour ce salon.");
  });
  socket.on("salon_error", ({ message }) => {
    r.error = message;
  });
}
