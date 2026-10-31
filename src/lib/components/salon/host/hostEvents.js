import { playSound, SOUNDS } from "./sounds.js";
import { SPECIAL_INTRO_MS } from "../../../data/salonOptions.js";

// Réactions de l'écran TV aux événements du salon (état h : SalonHost).
export function listenHost(h, socket) {
  socket.on("salon_host_joined", (data) => {
    h.joined = true;
    h.pro = data.pro;
    h.settings = data.settings || {};
    h.players = data.players || [];
    h.teams = data.teams;
    h.night = data.night;
    h.intermission = data.evening?.intermission ?? null;
    h.finale = data.evening?.finale ?? null;
    h.buzzer = data.buzzer;
    h.mediaCheck = data.mediaCheck;
    h.paused = data.paused;
    h.phase = data.phase || "lobby";
    h.round = data.currentRound || 0;
    h.total = h.settings.maxRounds || 10;
    h.chat.update(data.support);
  });

  socket.on("salon_night", ({ night }) => {
    h.night = night;
  });
  socket.on("salon_evening", ({ intermission, finale }) => {
    h.intermission = intermission;
    h.finale = finale;
  });
  socket.on("salon_buzzed", (buzzer) => {
    h.buzzer = buzzer;
    if (h.settings.buzzSound !== false) playSound(SOUNDS.buzz, h.volume / 100);
  });
  // Vidéo bloquée par YouTube pendant la manche : l'extrait audio prend le relais
  socket.on("salon_use_audio", ({ audioUrl }) => {
    h.hostCenter?.useAudio(audioUrl);
  });
  socket.on("salon_media_check", (check) => {
    h.mediaCheck = check;
  });
  socket.on("salon_video_outage", ({ retryIn }) => {
    h.videoOutage = retryIn;
  });
  socket.on("salon_buzz_result", () => {
    h.buzzer = null;
  });

  socket.on("salon_pro", ({ pro }) => {
    h.pro = pro;
  });

  socket.on("salon_roster", ({ players, teams }) => {
    h.mergeRoster(players);
    h.teams = teams;
  });
  socket.on("salon_settings", ({ settings }) => {
    h.settings = settings;
    h.total = settings.maxRounds;
  });
  socket.on("salon_volume", ({ volume }) => h.applyVolume(volume));
  socket.on("salon_paused", ({ paused }) => {
    h.paused = paused;
    if (paused) h.hostCenter?.pauseVideo();
    else if (!h.flashCut) h.hostCenter?.resumeVideo();
    if (paused) h.clearAutoNext();
  });

  socket.on("salon_scores_update", ({ scores, teams }) => {
    if (teams) h.teams = teams;
    h.players = h.players
      .map((pl) => {
        const s = scores.find((s) => s.username === pl.username);
        return s ? { ...pl, score: s.score } : pl;
      })
      .sort((a, b) => b.score - a.score);
  });

  socket.on("salon_game_starting", () => {
    h.phase = "starting";
  });

  socket.on("salon_next_video", ({ videoId, startSeconds }) =>
    h.hostCenter?.preloadVideo(videoId, startSeconds),
  );

  socket.on("salon_round_start", (data) => {
    h.phase = "round";
    h.special = data.special ?? null;
    h.videoOutage = null;
    h.buzzer = null;
    h.flashCut = false;
    h.round = data.round;
    h.total = data.total;
    h.roundEnd = null;
    h.timerVal = 0;
    h.timerStarted = false;
    h.choices = data.choices || null;
    h.clearAutoNext();
    h.players = h.players.map((p) => ({
      ...p,
      foundThisRound: false,
      answeredThisRound: false,
      foundArtist: false,
      foundTitle: false,
      foundFeatCount: 0,
      totalFeatCount: data.featCount || 0,
    }));
    if (!data.special) return h.hostCenter?.loadMedia(data);
    // Manche spéciale : on prévient tout le monde avant la musique
    h.specialIntro = true;
    const round = data.round;
    setTimeout(() => {
      h.specialIntro = false;
      if (h.phase === "round" && h.round === round)
        h.hostCenter?.loadMedia(data);
    }, SPECIAL_INTRO_MS);
  });

  socket.on("salon_timer_started", ({ max }) => {
    h.timerVal = max;
    h.timerMax = max;
    h.timerStarted = true;
    if (h.special !== "flash") return;
    const round = h.round;
    setTimeout(() => {
      if (h.phase !== "round" || h.round !== round) return;
      h.flashCut = true;
      h.hostCenter?.pauseVideo();
    }, 5000);
  });
  socket.on("salon_timer_update", ({ current, max }) => {
    h.timerVal = current;
    h.timerMax = max;
    h.timerStarted = true;
  });

  socket.on("salon_player_answered", (a) => {
    h.players = h.players.map((p) =>
      p.username === a.username
        ? {
            ...p,
            // QCM : `answered` = a cliqué (pas encore juste ou faux)
            // Réponse libre : `correct` = tout trouvé
            answeredThisRound:
              a.answered === true ? true : p.answeredThisRound || false,
            foundThisRound:
              a.correct !== undefined && a.correct !== null
                ? a.correct
                : p.foundThisRound,
            foundArtist: a.foundArtist ?? p.foundArtist,
            foundTitle: a.foundTitle ?? p.foundTitle,
            foundFeatCount: a.foundFeatCount ?? p.foundFeatCount ?? 0,
            totalFeatCount: a.totalFeatCount ?? p.totalFeatCount ?? 0,
          }
        : p,
    );
  });

  socket.on("salon_round_end", (data) => {
    h.phase = "summary";
    h.buzzer = null;
    h.choices = null;
    h.roundEnd = data;
    h.teams = data.teams;
    setTimeout(() => h.hostCenter?.revealVideo(), 200);
    if (data.scores) {
      const m = Object.fromEntries(
        data.scores.map((s) => [s.username, s.score]),
      );
      h.players = h.players
        .map((p) => ({ ...p, score: m[p.username] ?? p.score }))
        .sort((a, b) => b.score - a.score);
    }
    if (!h.settings.manualNext)
      h.startAutoNextCountdown(h.settings.showAnswerDuration || 7);
  });

  socket.on("salon_game_over", (data) => {
    h.phase = "gameover";
    h.gameOver = data;
    h.teams = data.teams;
    h.night = data.night;
    h.clearAutoNext();
    h.hostCenter?.fadeOut();
  });

  socket.on("salon_restarted", ({ players }) => {
    h.mergeRoster(players);
    h.roundEnd = null;
    h.gameOver = null;
    h.clearAutoNext();
  });

  socket.on(
    "salon_playlists_changed",
    ({ playlistIds, trackCount, appliedNow, remainingRounds }) => {
      h.settings = { ...h.settings, playlistIds };
      h.playlistNotice = appliedNow
        ? `Nouvelle sélection (${trackCount} titres) : elle démarre dès la manche suivante, ${remainingRounds} restante${remainingRounds > 1 ? "s" : ""}.`
        : `Nouvelle sélection (${trackCount} titres) : elle s'appliquera à la prochaine partie.`;
      setTimeout(() => {
        h.playlistNotice = "";
      }, 8000);
    },
  );

  socket.on("salon_error", ({ message }) => {
    h.error = message;
  });
}
