// Réactions du téléphone joueur aux événements du salon (état p : SalonPlayer).
export function listenPlayer(p, socket, c, u) {
  socket.on("salon_joined", (data) => onJoined(p, data, c, u));

  const resetScores = () => {
    p.scores = [];
    p.myScore = 0;
    p.finalScores = [];
  };
  socket.on("salon_game_starting", () => {
    p.phase = "starting";
    resetScores();
  });
  socket.on("salon_restarted", resetScores);

  socket.on("salon_roster", ({ players, teams }) => {
    p.roster = players;
    p.teams = teams;
    p.myTeam = players.find((p) => p.username === p.username)?.team ?? p.myTeam;
  });
  socket.on("salon_paused", ({ paused }) => {
    p.paused = paused;
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

  socket.on("salon_round_start", (data) => {
    p.phase = "round";
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

  socket.on("salon_timer_started", ({ max }) => {
    p.timerVal = max;
    p.timerMax = max;
    p.timerStarted = true;
    if (p.answerMode === "free") {
      setTimeout(() => {
        document.getElementById("salon-guess-input")?.focus();
      }, 100);
    }
  });

  socket.on("salon_timer_update", ({ current, max }) => {
    p.timerVal = current;
    p.timerMax = max;
  });

  socket.on("salon_feedback", (data) => onFeedback(p, data));

  socket.on("salon_scores_update", ({ scores, teams }) => {
    p.scores = scores;
    if (teams) p.teams = teams;
    const me = scores.find((p) => p.username === p.username);
    if (me) p.myScore = me.score;
  });

  socket.on("salon_round_end", (data) => {
    p.roundEnd = data;
    p.allFound = true;
    if (data.scores) p.scores = data.scores;
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

  socket.on("salon_game_over", ({ scores, teams }) => {
    p.phase = "gameover";
    p.finalScores = scores;
    p.teams = teams;
  });

  socket.on("salon_error", ({ message }) => {
    p.joining = false;
    if (!p.joined) {
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
  p.roster = data.players || [];
  p.teams = data.teams;
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
    p.scores = [];
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
