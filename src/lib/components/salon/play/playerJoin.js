// Arrivée et retour du téléphone dans la soirée (état p : SalonPlayer).
export function listenJoin(p, socket, chrono, c, u) {
  socket.on("salon_joined", (data) => {
    // Décompte annulé pendant la coupure : le serveur renvoie celui en cours
    p.stopCountdowns();
    onJoined(p, data, c, u);
    if (data.endsAt) chrono.start(data.endsAt, data.now);
    else chrono.stop();
  });
  // Soirée complète : en file. Le jeton garde la place et le pseudo à chaque
  // reconnexion (sendJoin le renvoie). Aussi un joueur retiré du lobby après
  // une coupure, puis remis en file
  socket.on("salon_waiting", ({ username, token }) => {
    p.joining = false;
    p.joined = false;
    p.waiting = true;
    p.username = username;
    p.code = c;
    p.token = token;
    try {
      localStorage.setItem("zik_salon_player_" + c, token);
      // Page rechargée : le pseudo est déjà tapé
      localStorage.setItem("salon_user", username);
    } catch {
      /* stockage bloqué : le jeton reste en mémoire */
    }
  });
  socket.on("salon_server_restart", () => (p.restarting = true));
  // Aussi après une coupure pendant une demande : on la refait d'un clic
  socket.on("salon_name_taken", ({ username }) => {
    p.joining = false;
    p.waiting = false;
    p.reclaimPending = false;
    p.nameTaken = username;
  });
  socket.on("salon_reclaim_ok", ({ token }) => {
    p.token = token;
    p.nameTaken = null;
    p.reclaimPending = false;
    p.sendJoin?.();
  });
}

// « Quitter la file » confirmé : retour au formulaire, pseudo gardé. On ne
// coupe qu'à l'accusé, sinon un relais qui regroupe les trames perd la sortie
// et le pseudo reste réservé 10 minutes
export function quitQueue(p) {
  const s = p.socket;
  p.socket = null;
  p.waiting = false;
  if (!s?.connected) return s?.disconnect();
  s.timeout(2000).emit("salon_queue_leave", {}, () => s.disconnect());
}

function onJoined(p, data, c, u) {
  // Sorti de la file : bandeau d'entrée, gardé après une simple reconnexion
  p.admitted = !!p.waiting || (!!p.admitted && !!data.reconnecting);
  p.waiting = false;
  p.restarting = false;
  // Le serveur renvoie la phase : une relance en cours se lit au décompte renvoyé
  p.replaying = false;
  p.joined = true;
  p.username = data.username;
  p.code = c;
  p.answerMode = data.settings?.answerMode || "free";
  p.total = data.settings?.maxRounds || 10;
  p.joining = false;
  p.error = "";
  p.token = data.token;
  try {
    localStorage.setItem("salon_code", c);
    localStorage.setItem("salon_user", u);
    localStorage.setItem("zik_salon_player_" + c, data.token);
    localStorage.setItem("salon_at", String(Date.now()));
  } catch {
    /* stockage bloqué (navigation privée) : le jeton reste en mémoire */
  }
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
    if (data.round !== p.round) {
      p.revealCorrectIndex = null;
      p.guess = "";
    }
    p.round = data.round ?? p.round;
    // Manche spéciale déjà annoncée : pas de nouvelle intro au retour
    p.special = data.special ?? null;
    p.specialIntro = false;
    p.buzzer = data.buzzer ?? null;
    p.buzzLocked = !!data.buzzLocked;
    // Le serveur fait foi : une réponse tapée hors ligne n'est jamais partie
    if ("chosenIndex" in data) p.chosenIndex = data.chosenIndex;
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
