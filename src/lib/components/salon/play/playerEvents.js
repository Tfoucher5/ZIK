import { SPECIAL_INTRO_MS } from "../../../data/salonOptions.js";
import { countdown } from "../countdown.js";

// Réactions du téléphone joueur aux événements du salon (état p : SalonPlayer).
export function listenPlayer(p, socket, c, u) {
  const chrono = countdown((v) => (p.timerVal = v));
  socket.on("salon_joined", (data) => {
    onJoined(p, data, c, u);
    if (data.endsAt) chrono.start(data.endsAt, data.now);
    else chrono.stop();
  });
  socket.on("salon_server_restart", () => (p.restarting = true));
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
  };
  socket.on("salon_game_starting", () => {
    p.phase = "starting";
    resetScores();
  });
  socket.on("salon_restarted", resetScores);

  socket.on("salon_roster", ({ roster, teams, team }) => {
    p.roster = roster;
    p.teams = teams;
    p.myTeam = team ?? p.myTeam;
  });
  socket.on("salon_video_outage", ({ retryIn }) => {
    p.videoOutage = retryIn;
  });
  socket.on("salon_notice", ({ message }) => {
    p.adminNotice = message;
  });
  socket.on("salon_buzzed", ({ username }) => {
    p.buzzer = username;
  });
  socket.on("salon_buzz_result", ({ username, correct }) => {
    p.buzzer = null;
    if (username === p.username && !correct) p.buzzLocked = true;
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

  socket.on("salon_round_end", () => chrono.stop());
  socket.on("salon_round_start", (data) => {
    p.restored = null;
    p.phase = "round";
    p.special = data.special ?? null;
    p.specialIntro = !!data.special;
    if (data.special)
      setTimeout(() => (p.specialIntro = false), SPECIAL_INTRO_MS);
    p.videoOutage = null;
    p.buzzer = null;
    p.buzzLocked = false;
    p.round = data.round;
    p.total = data.total;
    p.choices = data.choices || null;
    p.roundEnd = null;
    p.guess = "";
    p.allFound = false;
    p.chosenIndex = null;
    p.revealCorrectIndex = null;
    p.timerStarted = false;
    p.timerVal = 0;
    clearTimeout(p.revealTimer);
    p.revealTimer = null;
    p.foundArtist = false;
    p.foundTitle = false;
    p.foundFeats = Array(data.featCount || 0).fill(false);
    p.extras = (data.extras || []).map((e) => e.label);
    p.foundExtras = Array(p.extras.length).fill(false);
  });

  socket.on("salon_timer_started", ({ max, endsAt, now }) => {
    p.timerVal = max;
    p.timerMax = max;
    p.timerStarted = true;
    if (endsAt) chrono.start(endsAt, now);
    if (p.answerMode === "free") {
      setTimeout(() => {
        document.getElementById("salon-guess-input")?.focus();
      }, 100);
    }
  });

  socket.on("salon_timer_update", ({ max, endsAt, now }) => {
    chrono.start(endsAt, now);
    p.timerMax = max;
  });

  socket.on("salon_feedback", (data) => onFeedback(p, data));

  socket.on("salon_scores_update", ({ ranking, teams }) => {
    p.ranking = ranking;
    if (teams) p.teams = teams;
    if (ranking.me) p.myScore = ranking.me.score;
  });

  socket.on("salon_round_end", (data) => {
    p.roundEnd = data;
    p.allFound = true;
    p.ranking = data.ranking;
    p.teams = data.teams;

    if (p.answerMode === "multiple" && data.correctChoiceIndex !== undefined) {
      // QCM : la bonne réponse s'affiche un instant avant le résumé
      p.revealCorrectIndex = data.correctChoiceIndex;
      clearTimeout(p.revealTimer);
      p.revealTimer = setTimeout(() => {
        p.revealTimer = null;
        p.revealCorrectIndex = null;
        p.phase = "summary";
      }, 2200);
    } else {
      p.phase = "summary";
    }
  });

  socket.on("salon_game_over", ({ ranking, teams, night }) => {
    p.phase = "gameover";
    p.finalRanking = ranking;
    p.teams = teams;
    p.night = night;
  });
  socket.on("salon_night", ({ night }) => {
    p.night = night;
  });

  socket.on("salon_error", ({ message }) => {
    p.joining = false;
    p.restarting = false;
    if (!p.joined) {
      // Salon fermé ou pseudo refusé : retour au formulaire, pseudo gardé
      p.resume = null;
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

function onJoined(p, data, c, u) {
  p.restarting = false;
  p.joined = true;
  p.username = data.username;
  p.code = c;
  p.answerMode = data.settings?.answerMode || "free";
  p.total = data.settings?.maxRounds || 10;
  p.joining = false;
  p.error = "";
  localStorage.setItem("salon_code", c);
  localStorage.setItem("salon_user", u);
  localStorage.setItem("zik_salon_player_" + c, data.token);
  localStorage.setItem("salon_at", String(Date.now()));
  p.roster = data.roster;
  p.teams = data.teams;
  p.night = data.night ?? null;
  p.intermission = data.evening?.intermission ?? null;
  p.finale = data.evening?.finale ?? null;
  p.myTeam = data.team;

  if (data.reconnecting) {
    // Reprise après une coupure : le serveur renvoie l'état de la manche
    p.phase = data.phase || "round";
    p.paused = !!data.paused;
    p.round = data.round ?? p.round;
    p.total = data.settings?.maxRounds ?? p.total;
    p.myScore = data.score ?? p.myScore;
    p.foundArtist = data.foundArtist ?? p.foundArtist;
    p.foundTitle = data.foundTitle ?? p.foundTitle;
    p.allFound = data.allFound ?? p.allFound;
    if (data.choices) p.choices = data.choices;
    if (typeof data.featCount === "number") {
      p.foundFeats = Array(data.featCount).fill(false);
      for (let i = 0; i < (data.foundFeatCount || 0); i++)
        p.foundFeats[i] = true;
    }
    if (data.extras) {
      p.extras = data.extras.map((e) => e.label);
      p.foundExtras = Array(p.extras.length).fill(false);
      for (let i = 0; i < (data.foundExtrasCount || 0); i++)
        p.foundExtras[i] = true;
    }
    p.timerVal = data.timerVal ?? p.timerVal;
    p.timerMax = data.timerMax ?? p.timerMax;
    p.timerStarted = data.timerActive ?? data.timerVal > 0;
  } else {
    // Nouvelle arrivée : tout repart de zéro
    p.phase = "lobby";
    p.myScore = 0;
    p.ranking = null;
    p.foundArtist = false;
    p.foundTitle = false;
    p.foundFeats = [];
    p.foundExtras = [];
    p.extras = [];
    p.allFound = false;
  }
}

function onFeedback(p, data) {
  p.showFeedback(data);
  if (!data.correct) return;
  p.myScore += data.points;
  if (data.type === "success_artist") p.foundArtist = true;
  else if (data.type === "success_title") {
    p.foundTitle = true;
    if (p.answerMode === "multiple") p.foundArtist = true;
  } else if (data.type === "success_feat") {
    const idx = p.foundFeats.findIndex((f) => !f);
    if (idx !== -1)
      p.foundFeats = p.foundFeats.map((f, i) => (i === idx ? true : f));
  } else if (data.type === "success_extra") {
    const ei = data.extraIndex;
    if (ei !== undefined)
      p.foundExtras = p.foundExtras.map((f, i) => (i === ei ? true : f));
  }
  p.allFound =
    p.foundArtist &&
    p.foundTitle &&
    p.foundFeats.every(Boolean) &&
    p.foundExtras.every(Boolean);
}
