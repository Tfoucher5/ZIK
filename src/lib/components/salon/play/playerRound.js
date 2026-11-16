import { SPECIAL_INTRO_MS } from "../../../data/salonOptions.js";

// Déroulé d'une manche sur le téléphone (état p : SalonPlayer).
export function listenRound(p, socket, chrono) {
  socket.on("salon_buzzed", ({ username }) => {
    p.buzzer = username;
  });
  socket.on("salon_buzz_result", ({ username, correct }) => {
    p.buzzer = null;
    if (username === p.username && !correct) p.buzzLocked = true;
  });

  socket.on("salon_round_end", () => chrono.stop());
  socket.on("salon_round_start", (data) => {
    p.restored = null;
    p.replaying = false;
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
    // Accusé perdu (réseau lent) : le serveur dit quelle case il a comptée
    if ("chosenIndex" in data) p.chosenIndex = data.chosenIndex;

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
