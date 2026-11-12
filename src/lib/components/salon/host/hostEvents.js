import { playSound, SOUNDS } from "./sounds.js";
import { SPECIAL_INTRO_MS } from "../../../data/salonOptions.js";
import { countdown, listenCountdowns } from "../countdown.js";
import { forgetSalon } from "../../../client/salonClient.js";

// Réactions de l'écran TV aux événements du salon (état h : SalonHost).
export function listenHost(h, socket) {
  const chrono = countdown((v) => (h.timerVal = v));
  h.stopCountdowns = listenCountdowns(h, socket);
  socket.on("salon_server_restart", () => {
    h.restarting = true;
    h.hostCenter?.pauseVideo();
  });
  // Pause ou fin de partie pendant l'annonce : plus de reprise à annoncer
  socket.on("salon_paused", () => (h.restored = null));
  socket.on("salon_game_over", () => (h.restored = null));
  socket.on("salon_restored", ({ resumeIn }) => {
    h.restored = { resumeIn };
    if (resumeIn == null) setTimeout(() => (h.restored = null), 4000);
  });
  socket.on("salon_host_joined", (data) => {
    h.restarting = false;
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
    if (data.endsAt) {
      h.timerMax = data.timerMax;
      h.timerStarted = true;
      chrono.start(data.endsAt, data.now);
    } else chrono.stop();
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
  socket.on("salon_notice", ({ message }) => {
    h.adminNotice = message;
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
    if (paused) chrono.stop();
    if (paused) h.hostCenter?.pauseVideo();
    else if (!h.flashCut) h.hostCenter?.resumeVideo();
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

  socket.on("salon_round_end", () => chrono.stop());
  socket.on("salon_round_start", (data) => {
    h.restored = null;
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

  socket.on("salon_timer_started", ({ max, endsAt, now }) => {
    h.timerVal = max;
    h.timerMax = max;
    h.timerStarted = true;
    if (endsAt) chrono.start(endsAt, now);
    if (h.special !== "flash") return;
    const round = h.round;
    setTimeout(() => {
      if (h.phase !== "round" || h.round !== round) return;
      h.flashCut = true;
      h.hostCenter?.pauseVideo();
    }, 5000);
  });
  socket.on("salon_timer_update", ({ max, endsAt, now }) => {
    chrono.start(endsAt, now);
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
  });

  socket.on("salon_game_over", (data) => {
    h.phase = "gameover";
    h.gameOver = data;
    h.teams = data.teams;
    h.night = data.night;
    h.hostCenter?.fadeOut();
  });

  socket.on("salon_restarted", ({ players }) => {
    h.mergeRoster(players);
    h.roundEnd = null;
    h.gameOver = null;
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

  socket.on("salon_closed", () => {
    forgetSalon(h.code);
    window.location.href = "/salon";
  });

  socket.on("salon_error", ({ message }) => {
    if (!h.joined) forgetSalon(h.code);
    h.restarting = false;
    h.error = message;
  });
}
