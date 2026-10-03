import { createRequire } from "module";
const require = createRequire(import.meta.url);
const stringSimilarity = require("string-similarity");

import { randomBytes } from "crypto";
import { YouTube } from "youtube-sr";

import { supabase } from "../config.js";
import { userClient } from "../middleware/auth.js";
import { salonRooms, setIO, getIO } from "../state.js";
import {
  buildTrackFromRow,
  calcSpeedBonus,
  cleanString,
  displayString,
  TRACK_ROW_SELECT,
} from "../services/playlist.js";
import { makeTeams, cleanTeamName, teamStandings } from "./salonTeams.js";
import { isPro } from "../services/pro.js";
import { FREE_MAX_PLAYERS, FREE_MAX_TEAMS } from "../../proPlans.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const SALON_CLEANUP_DELAY = 30 * 60 * 1000; // 30 min
// Large : un PC de bar qui se met en veille ou un onglet rechargé ne doit pas
// fermer la soirée
const HOST_RECONNECT_GRACE = 10 * 60 * 1000; // 10 min
const PLAYER_RECONNECT_GRACE = 90 * 1000; // 90 s

// ─── Persistance des parties ──────────────────────────────────────────────────
// Une partie salon n'a pas de ligne game_players : les invités n'ont pas de
// compte et le salon ne doit pas compter dans les classements. Seuls la partie
// et son nombre de joueurs sont gardés, pour les statistiques.

async function recordSalonGameStart(salon) {
  salon.game.dbGameId = null;
  try {
    const { data } = await supabase
      .from("games")
      .insert({
        room_id: salon.code,
        rounds: salon.settings.maxRounds,
        mode: salon.settings.answerMode === "multiple" ? "qcm" : "classic",
        source: "salon",
        origin: salon.origin,
      })
      .select("id")
      .single();
    if (data) salon.game.dbGameId = data.id;
  } catch {
    /* non bloquant */
  }
}

function recordSalonGameEnd(salon) {
  const id = salon.game.dbGameId;
  if (!id) return;
  salon.game.dbGameId = null;
  supabase
    .from("games")
    .update({
      ended_at: new Date().toISOString(),
      player_count: Object.keys(salon.players).length,
    })
    .eq("id", id)
    .then(({ error }) => {
      if (error) console.error("[salon] fin de partie:", error.message);
    });
}

// ─── Code generation ──────────────────────────────────────────────────────────

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from(
      { length: 6 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
  } while (salonRooms[code]);
  return code;
}

// ─── Playlist loading ─────────────────────────────────────────────────────────

async function loadTracksForPlaylist(playlistId, client = supabase) {
  try {
    const { data: rows } = await client
      .from("custom_playlist_tracks")
      .select(TRACK_ROW_SELECT)
      .eq("playlist_id", playlistId)
      .order("position");
    if (rows?.length) {
      return rows.map(buildTrackFromRow);
    }
  } catch {
    // ignore
  }
  return [];
}

// Accepts a single ID or an array of IDs — returns combined, deduplicated, shuffled tracks
async function loadSalonTracks(playlistIds, client = supabase) {
  const ids = Array.isArray(playlistIds) ? playlistIds : [playlistIds];
  const seen = new Set();
  const all = [];
  for (const id of ids) {
    const tracks = await loadTracksForPlaylist(id, client);
    for (const t of tracks) {
      const key = `${t.artist}|${t.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        all.push(t);
      }
    }
  }
  // Fisher-Yates shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

/**
 * Tire au hasard les titres d'une session dans le pool complet.
 * Les manches consomment le tableau par la fin (pop), l'ordre est donc deja
 * celui du jeu.
 */
export function buildSessionPlaylist(fullPlaylist, count) {
  const pool = [...fullPlaylist];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.max(0, count));
}

// ─── Multiple choice helpers ──────────────────────────────────────────────────

function makeChoices(correct, allTracks) {
  const label = (t) =>
    `${displayString(t.mainArtist || t.artist)} - ${displayString(t.title)}`;
  const correctLabel = label(correct);
  const correctArtistKey = (correct.mainArtist || correct.artist || "")
    .toLowerCase()
    .trim();

  const pool = allTracks.filter((t) => label(t) !== correctLabel);

  // Split: same artist vs different artist (for deliberate decoy feature)
  const sameArtistPool = pool.filter(
    (t) =>
      (t.mainArtist || t.artist || "").toLowerCase().trim() ===
      correctArtistKey,
  );
  const diffArtistPool = pool.filter(
    (t) =>
      (t.mainArtist || t.artist || "").toLowerCase().trim() !==
      correctArtistKey,
  );

  let wrongTracks;
  // ~40% chance: deliberately include a same-artist decoy when one exists
  // This forces players to identify the exact title, not just the artist
  if (sameArtistPool.length >= 1 && Math.random() < 0.4) {
    const decoy =
      sameArtistPool[Math.floor(Math.random() * sameArtistPool.length)];
    const remaining = diffArtistPool
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);
    wrongTracks = [decoy, ...remaining].sort(() => Math.random() - 0.5);
  } else {
    wrongTracks = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  }

  const choices = [correctLabel, ...wrongTracks.map(label)].sort(
    () => Math.random() - 0.5,
  );
  return {
    choices,
    correctChoiceIndex: choices.indexOf(correctLabel),
  };
}

// Kahoot-style scoring: 1000pts at t=0, decreasing to 200pts at t=roundDuration
function calcQcmPoints(timeTaken, roundDuration) {
  const MAX_PTS = 1000;
  const MIN_PTS = 200;
  const ratio = Math.min(
    1,
    Math.max(0, timeTaken / Math.max(1, roundDuration)),
  );
  return Math.round(MAX_PTS - (MAX_PTS - MIN_PTS) * ratio);
}

// ─── Answer checking ──────────────────────────────────────────────────────────

function checkMatch(input, target) {
  if (!input || !target) return false;
  const len = input.length;
  const tLen = target.length;
  if (input === target) return true;
  if (len >= 3 && target.includes(input) && len / tLen >= 0.4) return true;
  if (tLen >= 3 && input.includes(target) && tLen / len >= 0.6) return true;
  const sim = stringSimilarity.compareTwoStrings(input, target);
  if (len <= 2) return sim >= 0.95;
  if (sim >= 0.72) return true;
  if (len >= 6 && sim >= 0.65) return true;
  return false;
}

function checkClose(input, target) {
  if (!input || !target || input.length < 2) return false;
  const sim = stringSimilarity.compareTwoStrings(input, target);
  if (sim >= 0.42) return true;
  if (input.length >= 3 && target.length >= 3) {
    for (let i = 0; i <= target.length - input.length + 1; i++) {
      const chunk = target.slice(i, i + input.length);
      if (stringSimilarity.compareTwoStrings(input, chunk) >= 0.8) return true;
    }
  }
  return false;
}

// ─── Room cleanup ─────────────────────────────────────────────────────────────

function scheduleCleanup(code) {
  const salon = salonRooms[code];
  if (!salon) return;
  clearTimeout(salon._cleanupTimer);
  salon._cleanupTimer = setTimeout(() => {
    const s = salonRooms[code];
    if (s) {
      clearInterval(s.game.interval);
      clearTimeout(s.game.breakTimer);
      clearTimeout(s.game.musicReadyTimer);
    }
    delete salonRooms[code];
    console.log(`Salon "${code}" libere de la memoire`);
  }, SALON_CLEANUP_DELAY);
}

function cleanupNow(code, io) {
  const salon = salonRooms[code];
  if (!salon) return;
  clearTimeout(salon._cleanupTimer);
  clearInterval(salon.game.interval);
  clearTimeout(salon.game.breakTimer);
  clearTimeout(salon.game.musicReadyTimer);
  if (io) {
    io.to(`salon:${code}`).emit("salon_error", {
      message: "L'hôte a quitté le salon.",
    });
  }
  delete salonRooms[code];
  console.log(`Salon "${code}" ferme (hote deconnecte)`);
}

// ─── Player helpers ───────────────────────────────────────────────────────────

function makePlayer(username, socketId) {
  return {
    username,
    socketId,
    score: 0,
    foundArtist: false,
    foundTitle: false,
    foundFeats: [],
    foundExtras: [],
    _fullFoundCounted: false,
    _choiceIndex: null,
    _choiceTimeTaken: null,
    team: null,
    stats: { found: 0, first: 0 },
    token: randomBytes(12).toString("base64url"),
    _lastGuessAt: 0,
  };
}

function addPlayer(salon, username, socketId) {
  // Pas d'équipe d'office : le joueur la choisit sur son téléphone, ou l'hôte
  // la lui donne depuis la régie. Coller un arrivant dans l'équipe la moins
  // remplie cassait les tables déjà constituées.
  const player = makePlayer(username, socketId);
  salon.players[username] = player;
  return player;
}

function getPlayerList(salon) {
  return Object.values(salon.players).map((p) => ({
    username: p.username,
    score: p.score,
    team: p.team,
    offline: !!p._disconnected,
    foundThisRound: p._fullFoundCounted,
    answeredThisRound:
      p.foundArtist || p.foundTitle || p.foundFeats.some(Boolean),
  }));
}

function standings(salon) {
  return teamStandings(salon.settings.teams, Object.values(salon.players));
}

function sortedScores(salon) {
  return Object.values(salon.players)
    .map((p) => ({ username: p.username, score: p.score, team: p.team }))
    .sort((a, b) => b.score - a.score);
}

// Écrans TV et régie : tout ce que les joueurs ne doivent pas recevoir
function staff(code, io) {
  return io.to([`salon:screens:${code}`, `salon:ctrl:${code}`]);
}

/**
 * Annonce à la régie combien d'écrans TV sont connectés.
 *
 * L'information existait déjà côté serveur — elle sert à décider quand
 * fermer le salon — mais n'était jamais transmise : l'exploitant ne pouvait
 * pas voir qu'aucune TV n'était branchée, ni que deux l'étaient et que le
 * son allait jouer en double.
 */
function broadcastScreens(code, io) {
  const count =
    io.sockets.adapter.rooms.get(`salon:screens:${code}`)?.size ?? 0;
  io.to(`salon:ctrl:${code}`).emit("salon_screens", { count });
}

function broadcastRoster(code, io) {
  const salon = salonRooms[code];
  if (!salon) return;
  io.to(`salon:${code}`).emit("salon_roster", {
    players: getPlayerList(salon),
    teams: standings(salon),
  });
}

// Fonction ZIK Pro : refusée aux salons gratuits, l'hôte voit l'offre
function requirePro(socket, salon, feature) {
  if (salon.pro) return true;
  socket.emit("salon_pro_required", { feature });
  return false;
}

function teamLimit(salon) {
  return salon.pro ? Infinity : FREE_MAX_TEAMS;
}

// Socket de la régie ou d'un écran ouvert avec la clé : seuls à piloter
function adminSalon(socket) {
  if (!socket.salonAdmin) return null;
  return salonRooms[socket.salonCode] ?? null;
}

function resetStats(salon) {
  for (const p of Object.values(salon.players)) {
    p.score = 0;
    p.stats = { found: 0, first: 0 };
  }
}

function resetRoundFlags(salon) {
  for (const p of Object.values(salon.players)) {
    p.scoreBeforeRound = p.score;
    p.foundArtist = false;
    p.foundTitle = false;
    p.foundFeats = [];
    p.foundExtras = [];
    p._fullFoundCounted = false;
    p._choiceIndex = null;
    p._choiceTimeTaken = null;
  }
}

// Returns true if this player has found everything for the current track
function playerFullyFound(player, track) {
  const allFeats = (track.cleanFeatArtists || []).every(
    (_, i) => player.foundFeats[i],
  );
  const allExtras = (track.extraAnswers || []).every(
    (_, i) => player.foundExtras[i],
  );
  return player.foundArtist && player.foundTitle && allFeats && allExtras;
}

function checkEveryoneDone(code, io) {
  const salon = salonRooms[code];
  if (!salon || salon.game.phase !== "round") return;
  // Only count connected players — disconnected ones can't answer
  const players = Object.values(salon.players).filter((p) => !p._disconnected);
  if (players.length === 0) return;
  // In QCM mode: done when everyone has answered (right or wrong)
  // In free mode: done when everyone has found all elements
  const allDone =
    salon.settings.answerMode === "multiple"
      ? players.every((p) => p._fullFoundCounted)
      : players.every((p) => playerFullyFound(p, salon.game.currentTrack));
  if (allDone) endRound(code, "Tout le monde a répondu !", io);
}

// ─── Game loop ────────────────────────────────────────────────────────────────

// Called when the host signals that the music is actually playing.
// Also called by a fallback timeout if no signal arrives within 5s.
function startTimer(code, io) {
  const salon = salonRooms[code];
  if (
    !salon ||
    salon.game.phase !== "round" ||
    salon.game.interval ||
    salon.game.paused
  )
    return;
  const game = salon.game;
  const duration = salon.settings.roundDuration;

  clearTimeout(game.musicReadyTimer);
  game.musicReadyTimer = null;
  game.startTime = Date.now();
  game.timerValue = duration;
  game.timerMax = duration;
  game.timerActive = true;

  io.to(`salon:${code}`).emit("salon_timer_started", { max: duration });
  runTimer(code, io);
}

function runTimer(code, io) {
  const game = salonRooms[code].game;
  game.interval = setInterval(() => {
    game.timerValue--;
    io.to(`salon:${code}`).emit("salon_timer_update", {
      current: game.timerValue,
      max: game.timerMax,
    });
    if (game.timerValue <= 0) {
      endRound(code, "Temps écoulé !", io);
    }
  }, 1000);
}

// ─── Pause ────────────────────────────────────────────────────────────────────

function pauseGame(code, io) {
  const game = salonRooms[code]?.game;
  if (!game || game.paused || !["round", "summary"].includes(game.phase))
    return;
  game.paused = true;
  game.pausedAt = Date.now();
  clearInterval(game.interval);
  game.interval = null;
  clearTimeout(game.musicReadyTimer);
  game.musicReadyTimer = null;
  clearTimeout(game.breakTimer);
  game.breakTimer = null;
  io.to(`salon:${code}`).emit("salon_paused", { paused: true });
}

function clearPause(code, io) {
  const game = salonRooms[code].game;
  if (!game.paused) return false;
  game.paused = false;
  // Le temps de pause ne compte pas dans le bonus de rapidité
  game.startTime += Date.now() - game.pausedAt;
  io.to(`salon:${code}`).emit("salon_paused", { paused: false });
  return true;
}

function resumeGame(code, io) {
  const salon = salonRooms[code];
  if (!salon || !clearPause(code, io)) return;
  const game = salon.game;
  if (game.phase === "round") {
    if (game.timerActive) runTimer(code, io);
    else game.musicReadyTimer = setTimeout(() => startTimer(code, io), 12000);
  } else if (game.phase === "summary" && !salon.settings.manualNext) {
    game.breakTimer = setTimeout(() => {
      game.breakTimer = null;
      startNextRound(code, io);
    }, 3000);
  }
}

function finishGame(code, io) {
  const salon = salonRooms[code];
  const game = salon.game;
  clearInterval(game.interval);
  game.interval = null;
  clearTimeout(game.breakTimer);
  game.breakTimer = null;
  clearTimeout(game.musicReadyTimer);
  game.musicReadyTimer = null;
  if (game.paused) clearPause(code, io);
  game.phase = "gameover";
  recordSalonGameEnd(salon);
  const scores = Object.values(salon.players)
    .map((p) => ({
      username: p.username,
      score: p.score,
      team: p.team,
      found: p.stats.found,
      first: p.stats.first,
    }))
    .sort((a, b) => b.score - a.score);
  io.to(`salon:${code}`).emit("salon_game_over", {
    scores,
    teams: standings(salon),
    history: game.history,
    rounds: game.history.length,
  });
  prepareSession(code, io);
  scheduleCleanup(code);
}

function endRound(code, reason, io) {
  const salon = salonRooms[code];
  if (!salon) return;
  const game = salon.game;

  clearInterval(game.interval);
  game.interval = null;
  game.paused = false;
  game.phase = "summary";

  const track = game.currentTrack;
  const answer = `${displayString(track.mainArtist || track.artist)} - ${displayString(track.title)}`;

  // ── QCM deferred scoring: compute points and send individual feedback now ──
  if (salon.settings.answerMode === "multiple") {
    // Determine firstFinder: the correct player with the lowest timeTaken
    if (!game.firstFinder) {
      const firstCorrect = Object.values(salon.players)
        .filter(
          (p) =>
            p._fullFoundCounted &&
            p._choiceIndex === game.correctChoiceIndex &&
            !p._disconnected,
        )
        .sort(
          (a, b) =>
            (a._choiceTimeTaken ?? Infinity) - (b._choiceTimeTaken ?? Infinity),
        )[0];
      if (firstCorrect) game.firstFinder = firstCorrect.username;
    }

    for (const p of Object.values(salon.players)) {
      if (!p.socketId || p._disconnected) continue;
      if (p._fullFoundCounted) {
        // They answered — evaluate
        const correct = p._choiceIndex === game.correctChoiceIndex;
        if (correct) {
          const points = calcQcmPoints(
            p._choiceTimeTaken ?? salon.settings.roundDuration,
            salon.settings.roundDuration,
          );
          p.score += points;
          p.foundArtist = true;
          p.foundTitle = true;
          io.to(p.socketId).emit("salon_feedback", {
            type: "success_title",
            correct: true,
            points,
            msg: `Bonne réponse ! (+${points} pts)`,
          });
        } else {
          io.to(p.socketId).emit("salon_feedback", {
            type: "miss",
            correct: false,
            points: 0,
            msg: "Raté !",
          });
        }
      } else {
        // Didn't answer in time
        io.to(p.socketId).emit("salon_feedback", {
          type: "miss",
          correct: false,
          points: 0,
          msg: "Temps écoulé…",
        });
      }
    }
  }

  for (const p of Object.values(salon.players)) {
    const ok =
      salon.settings.answerMode === "multiple"
        ? p._fullFoundCounted && p._choiceIndex === game.correctChoiceIndex
        : p._fullFoundCounted;
    if (ok) p.stats.found++;
  }
  if (game.firstFinder && salon.players[game.firstFinder])
    salon.players[game.firstFinder].stats.first++;

  const scores = Object.values(salon.players)
    .map((p) => ({
      username: p.username,
      score: p.score,
      team: p.team,
      delta: p.score - (p.scoreBeforeRound ?? 0),
    }))
    .sort((a, b) => b.score - a.score);

  const roundSummary = {
    answer,
    cover: track.cover,
    reason,
    firstFinder: game.firstFinder,
    featArtists: (track.featArtists || []).map(displayString),
    scores,
    teams: standings(salon),
    correctChoiceIndex:
      salon.settings.answerMode === "multiple"
        ? game.correctChoiceIndex
        : undefined,
  };

  game.history.push({ answer, cover: track.cover });
  io.to(`salon:${code}`).emit("salon_round_end", roundSummary);
  scheduleCleanup(code);

  if (!salon.settings.manualNext) {
    game.breakTimer = setTimeout(() => {
      game.breakTimer = null;
      startNextRound(code, io);
    }, salon.settings.showAnswerDuration * 1000);
  }
}

async function searchTrackVideo(track, roundDuration) {
  const artist = track.mainArtist || track.artist;
  const results = await YouTube.search(`${artist} - ${track.title}`, {
    type: "video",
    limit: 5,
  });
  if (!results.length) throw new Error("No video");
  const video =
    results.find((v) => v.channel?.name?.endsWith("- Topic")) || results[0];
  const durationSec = Math.round((video.duration || 0) / 1000);
  const safeStart = Math.max(
    0,
    Math.floor(Math.random() * Math.max(1, durationSec - roundDuration - 10)),
  );
  return { video, safeStart };
}

// Cherche la vidéo du prochain titre et l'annonce à l'hôte, qui la met en
// mémoire tampon pendant la manche en cours : sur une connexion lente, la
// manche suivante démarre sans attendre le réseau.
function prefetchNextVideo(code, io) {
  const salon = salonRooms[code];
  const game = salon.game;
  const nextTrack = game.sessionPlaylist[game.sessionPlaylist.length - 1];
  if (!nextTrack) return;
  const gen = (game._prefetchGen = (game._prefetchGen ?? 0) + 1);
  game._prefetchPromise = searchTrackVideo(
    nextTrack,
    salon.settings.roundDuration,
  )
    .then((r) => {
      if (game._prefetchGen !== gen) return;
      game.prefetchedRound = { track: nextTrack, ...r };
      // Déjà sorti de la pile : la manche démarre avec, rien à précharger
      if (game.sessionPlaylist.at(-1) === nextTrack)
        announceNextVideo(salon, io);
    })
    .catch(() => {});
}

function announceNextVideo(salon, io) {
  const next = salon.game.prefetchedRound;
  if (!next) return;
  io.to(`salon:screens:${salon.code}`).emit("salon_next_video", {
    videoId: next.video.id,
    startSeconds: next.safeStart,
  });
}

// Tirage des titres dès le lobby (et au podium, pour la revanche) : la vidéo
// de la première manche est prête avant le clic sur « Lancer ».
function prepareSession(code, io) {
  const salon = salonRooms[code];
  salon.game.sessionPlaylist = buildSessionPlaylist(
    salon.game.fullPlaylist,
    salon.settings.maxRounds,
  );
  salon.game.prefetchedRound = null;
  salon.game.played = [];
  prefetchNextVideo(code, io);
}

async function startNextRound(code, io) {
  const salon = salonRooms[code];
  if (!salon) return;
  const game = salon.game;

  if (
    game.currentRound >= salon.settings.maxRounds ||
    game.sessionPlaylist.length === 0
  ) {
    finishGame(code, io);
    return;
  }

  game.currentRound++;
  game.firstFinder = null;
  resetRoundFlags(salon);
  game.currentTrack = game.sessionPlaylist.pop();
  game.played.push(game.currentTrack);
  game.choices = null;
  game.correctChoiceIndex = null;

  const track = game.currentTrack;

  try {
    let video, safeStart;
    if (game.prefetchedRound?.track === track) {
      ({ video, safeStart } = game.prefetchedRound);
      game.prefetchedRound = null;
    }
    if (!video && game._prefetchPromise) {
      await game._prefetchPromise.catch(() => {});
      game._prefetchPromise = null;
      if (game.prefetchedRound?.track === track) {
        ({ video, safeStart } = game.prefetchedRound);
        game.prefetchedRound = null;
      }
    }
    if (!video) {
      ({ video, safeStart } = await searchTrackVideo(
        track,
        salon.settings.roundDuration,
      ));
    }

    game.phase = "round";
    game.timerActive = false;
    game.timerValue = 0;
    game.startTime = 0;

    let choices = undefined;
    if (salon.settings.answerMode === "multiple") {
      const { choices: c, correctChoiceIndex: idx } = makeChoices(
        track,
        game.fullPlaylist,
      );
      game.choices = c;
      game.correctChoiceIndex = idx;
      choices = c;
    }

    const roundData = {
      videoId: video.id,
      startSeconds: safeStart,
      round: game.currentRound,
      total: salon.settings.maxRounds,
      choices,
      featCount: track.featArtists?.length || 0,
      extras: (track.extraAnswers || []).map((e) => ({ label: e.label })),
    };

    // La réponse ne part qu'à la régie : l'écran TV est public, n'importe
    // qui avec le code peut l'ouvrir
    io.to(`salon:screens:${code}`).emit("salon_round_start", roundData);
    io.to(`salon:ctrl:${code}`).emit("salon_round_start", {
      ...roundData,
      hostInfo: currentTrackInfo(salon),
    });
    // Send to players (no answer info)
    io.to(`salon:players:${code}`).emit("salon_round_start", roundData);

    // L'hôte signale le début de la musique ; filet si son lecteur ne répond
    // pas. Large : sur une connexion lente, la vidéo met du temps à démarrer.
    game.musicReadyTimer = setTimeout(() => startTimer(code, io), 12000);

    prefetchNextVideo(code, io);
  } catch (err) {
    console.error(`Salon skip "${track.title}":`, err.message);
    // Titre sans source : on ne consomme pas la manche, on passe au titre suivant
    game.currentRound--;
    startNextRound(code, io);
  }
}

function currentTrackInfo(salon) {
  const track = salon.game.currentTrack;
  if (!track) return null;
  return {
    artist: displayString(track.mainArtist || track.artist),
    title: displayString(track.title),
    cover: track.cover,
    correctChoiceIndex: salon.game.correctChoiceIndex,
  };
}

// ─── Public API for HTTP-based salon creation ─────────────────────────────────

export async function createSalonRoom({
  playlistIds,
  settings,
  token,
  hostUserId = null,
  origin = null,
}) {
  const client = token ? userClient(token) : supabase;
  const tracks = await loadSalonTracks(playlistIds, client);
  if (tracks.length < 3) {
    throw new Error(
      "Playlists introuvables ou trop courtes (min. 3 titres au total).",
    );
  }

  const code = generateCode();
  const pro = await isPro(hostUserId);
  const s = {
    maxRounds: Math.min(Math.max(settings.maxRounds || 10, 5), 20),
    roundDuration: Math.min(Math.max(settings.roundDuration || 30, 15), 60),
    manualNext: settings.manualNext === true,
    answerMode: settings.answerMode === "multiple" ? "multiple" : "free",
    showAnswerDuration: Math.min(
      Math.max(settings.showAnswerDuration || 7, 3),
      15,
    ),
    teams: makeTeams(
      pro ? settings.teamCount : Math.min(settings.teamCount, FREE_MAX_TEAMS),
    ),
  };
  // Clé de la régie : seul celui qui a créé le salon peut le piloter
  const adminKey = randomBytes(9).toString("base64url");

  salonRooms[code] = {
    code,
    adminKey,
    pro,
    hostUserId,
    origin,
    _hostDcTimer: null,
    _cleanupTimer: null,
    settings: { ...s, playlistIds },
    players: {},
    banned: new Set(),
    game: {
      phase: "lobby",
      currentRound: 0,
      sessionPlaylist: [],
      fullPlaylist: tracks,
      currentTrack: null,
      choices: null,
      correctChoiceIndex: null,
      interval: null,
      breakTimer: null,
      musicReadyTimer: null,
      timerValue: 0,
      timerActive: false,
      startTime: 0,
      firstFinder: null,
      history: [],
      played: [],
      paused: false,
    },
  };

  scheduleCleanup(code);
  console.log(`Salon "${code}" cree`);
  return { code, key: adminKey };
}

// Phases pendant lesquelles l'hote peut changer la selection de playlists.
// "starting" est exclu : la session est en train d'etre composee.
const PLAYLIST_SWAP_PHASES = ["lobby", "gameover", "round", "summary"];

// Phases ou une partie est en cours : les manches restantes sont retirees dans
// le nouveau pool, sans toucher a celles deja jouees.
const PLAYLIST_SWAP_LIVE_PHASES = ["round", "summary"];

/**
 * Remplace le pool de titres d'un salon deja ouvert.
 * La partie suivante (salon_start ou salon_restart) tire dans le nouveau pool.
 */
export async function changeSalonPlaylists({
  code,
  playlistIds,
  token,
  userId,
  key,
}) {
  const salon = salonRooms[code];
  if (!salon) throw new Error("Salon introuvable.");
  const isHost =
    (key && key === salon.adminKey) ||
    (salon.hostUserId && salon.hostUserId === userId);
  if (!isHost)
    throw new Error("Seul l'hote du salon peut changer les playlists.");
  if (!PLAYLIST_SWAP_PHASES.includes(salon.game.phase))
    throw new Error("Impossible de changer les playlists maintenant.");

  const client = token ? userClient(token) : supabase;
  const tracks = await loadSalonTracks(playlistIds, client);
  if (tracks.length < 3)
    throw new Error(
      "Playlists introuvables ou trop courtes (min. 3 titres au total).",
    );

  salon.game.fullPlaylist = tracks;
  salon.settings = { ...salon.settings, playlistIds };

  // En pleine partie, les manches restantes basculent sur le nouveau pool. La
  // manche en cours n'est pas interrompue : son titre a deja ete sorti de la
  // session et continue de jouer.
  const live = PLAYLIST_SWAP_LIVE_PHASES.includes(salon.game.phase);
  const remainingRounds = Math.max(
    0,
    salon.settings.maxRounds - salon.game.currentRound,
  );
  if (live) {
    salon.game.sessionPlaylist = buildSessionPlaylist(tracks, remainingRounds);
    // Le titre precharge venait de l'ancienne selection.
    salon.game.prefetchedRound = null;
    prefetchNextVideo(code, getIO());
  } else {
    prepareSession(code, getIO());
  }

  getIO()
    ?.to(`salon:${code}`)
    .emit("salon_playlists_changed", {
      playlistIds,
      trackCount: tracks.length,
      appliedNow: live,
      remainingRounds: live ? remainingRounds : null,
    });

  return { trackCount: tracks.length, appliedNow: live, remainingRounds };
}

// Pseudo affiché sur la TV : court, sans caractères invisibles
function cleanUsername(name) {
  return String(name ?? "")
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .trim()
    .slice(0, 20);
}

// ─── Socket registration ──────────────────────────────────────────────────────

export function registerSalon(io) {
  setIO(io);

  io.on("connection", (socket) => {
    // ── Host connects to their salon ──────────────────────────────────────────
    // ── Écran TV : public avec le code, pilotable seulement avec la clé ──────
    socket.on("salon_join_host", ({ code, key }) => {
      const salon = salonRooms[code];
      if (!salon)
        return socket.emit("salon_error", { message: "Salon introuvable." });
      if (!key || key !== salon.adminKey)
        return socket.emit("salon_error", {
          message: "Cet écran est réservé à l'hôte du salon.",
        });

      clearTimeout(salon._hostDcTimer);
      salon._hostDcTimer = null;

      socket.join(`salon:${code}`);
      socket.join(`salon:screens:${code}`);
      socket.salonCode = code;
      socket.salonRole = "screen";
      socket.salonAdmin = true;

      socket.emit("salon_host_joined", {
        pro: salon.pro,
        settings: salon.settings,
        players: getPlayerList(salon),
        teams: standings(salon),
        phase: salon.game.phase,
        paused: salon.game.paused,
        currentRound: salon.game.currentRound,
      });
      if (salon.game.phase === "lobby" && !salon.game.sessionPlaylist.length)
        prepareSession(code, io);
      else announceNextVideo(salon, io);
      scheduleCleanup(code);
      broadcastScreens(code, io);
    });

    // ── Régie : l'écran de pilotage, à côté de la TV ─────────────────────────
    socket.on("salon_join_control", ({ code, key }) => {
      const salon = salonRooms[code];
      if (!salon)
        return socket.emit("salon_error", { message: "Salon introuvable." });
      if (!key || key !== salon.adminKey)
        return socket.emit("salon_error", {
          message: "Lien de régie invalide.",
        });

      clearTimeout(salon._hostDcTimer);
      salon._hostDcTimer = null;
      socket.join(`salon:${code}`);
      socket.join(`salon:ctrl:${code}`);
      socket.salonCode = code;
      socket.salonRole = "control";
      socket.salonAdmin = true;

      const game = salon.game;
      socket.emit("salon_control_joined", {
        pro: salon.pro,
        settings: salon.settings,
        players: getPlayerList(salon),
        teams: standings(salon),
        phase: game.phase,
        paused: game.paused,
        currentRound: game.currentRound,
        timerVal: game.timerValue,
        timerMax: game.timerMax ?? salon.settings.roundDuration,
        timerActive: game.timerActive,
        track:
          game.phase === "round" || game.phase === "summary"
            ? currentTrackInfo(salon)
            : null,
        history: game.history,
        trackCount: game.fullPlaylist.length,
      });
      scheduleCleanup(code);
      broadcastScreens(code, io);
    });

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
      clearPause(salon.code, io);
      clearTimeout(salon.game.musicReadyTimer);
      endRound(salon.code, "Réponse révélée", io);
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
      const player = salon?.players[username];
      if (!player) return;
      clearTimeout(player._dcTimer);
      delete salon.players[username];
      // Ni ce pseudo ni ce téléphone ne reviennent dans la soirée
      salon.banned.add(username.toLowerCase());
      salon.banned.add(player.token);
      const target = player.socketId && io.sockets.sockets.get(player.socketId);
      if (target) {
        target.emit("salon_kicked");
        target.leave(`salon:${salon.code}`);
        target.leave(`salon:players:${salon.code}`);
        target.salonCode = null;
      }
      broadcastRoster(salon.code, io);
      checkEveryoneDone(salon.code, io);
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
      if (!salon) return;
      const code = salon.code;
      const s = salon.settings;
      const game = salon.game;
      const idle = game.phase === "lobby" || game.phase === "gameover";
      if (!idle && !requirePro(socket, salon, "liveSettings")) return;
      const clamp = (v, lo, hi, d) =>
        Math.min(Math.max(Math.round(Number(v)) || d, lo), hi);

      if ("roundDuration" in patch)
        s.roundDuration = clamp(patch.roundDuration, 15, 60, s.roundDuration);
      if ("showAnswerDuration" in patch)
        s.showAnswerDuration = clamp(
          patch.showAnswerDuration,
          3,
          15,
          s.showAnswerDuration,
        );
      if ("manualNext" in patch) s.manualNext = patch.manualNext === true;
      if (idle && "answerMode" in patch)
        s.answerMode = patch.answerMode === "multiple" ? "multiple" : "free";
      if ("maxRounds" in patch) {
        const n = clamp(
          patch.maxRounds,
          idle ? 5 : Math.max(5, game.currentRound),
          20,
          s.maxRounds,
        );
        if (n !== s.maxRounds) {
          s.maxRounds = n;
          if (idle) prepareSession(code, io);
          else {
            // Les titres déjà joués ne reviennent pas
            game.sessionPlaylist = buildSessionPlaylist(
              game.fullPlaylist.filter((t) => !game.played.includes(t)),
              n - game.currentRound,
            );
            game.prefetchedRound = null;
            prefetchNextVideo(code, io);
          }
        }
      }
      if (idle && "teamCount" in patch) {
        if (patch.teamCount > teamLimit(salon))
          return requirePro(socket, salon, "teams");
        s.teams = makeTeams(patch.teamCount, s.teams);
        // On ne redistribue pas : ajouter une équipe déplaçait tout le monde
        // en tourniquet et défaisait les placements choisis. Seuls ceux dont
        // l'équipe vient de disparaître sont libérés.
        const existantes = new Set((s.teams ?? []).map((t) => t.id));
        for (const p of Object.values(salon.players)) {
          if (p.team != null && !existantes.has(p.team)) p.team = null;
        }
        broadcastRoster(code, io);
      }
      // Passage en automatique pendant l'affichage d'une réponse
      if (
        game.phase === "summary" &&
        !s.manualNext &&
        !game.breakTimer &&
        !game.paused
      ) {
        game.breakTimer = setTimeout(() => {
          game.breakTimer = null;
          startNextRound(code, io);
        }, s.showAnswerDuration * 1000);
      }
      io.to(`salon:${code}`).emit("salon_settings", { settings: s });
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

    // Le joueur choisit son équipe avant la partie, pas en cours de route
    socket.on("salon_pick_team", ({ team } = {}) => {
      const salon = salonRooms[socket.salonCode];
      const player = salon?.players[socket.salonUsername];
      if (!player || !salon.settings.teams?.some((t) => t.id === team)) return;
      if (salon.game.phase !== "lobby" && salon.game.phase !== "gameover")
        return;
      player.team = team;
      broadcastRoster(salon.code, io);
    });

    // ── Player joins ──────────────────────────────────────────────────────────
    socket.on("salon_join_player", ({ code, username, token }) => {
      username = cleanUsername(username);
      if (!username)
        return socket.emit("salon_error", { message: "Pseudo requis." });

      const salon = salonRooms[code];
      if (!salon)
        return socket.emit("salon_error", {
          message: "Salon introuvable ou expiré.",
        });

      // ── Reconnect path: player was already in the game ────────────────────
      // Un retardataire entre dans la partie en cours avec 0 point, par le même
      // chemin qu'une reconnexion. Pendant le podium (gameover), il passe par le
      // join normal et attend la partie suivante.
      if (
        !salon.players[username] &&
        !salon.pro &&
        Object.keys(salon.players).length >= FREE_MAX_PLAYERS
      ) {
        io.to(`salon:ctrl:${code}`).emit("salon_pro_required", {
          feature: "players",
        });
        return socket.emit("salon_error", {
          message: "Le salon est complet.",
        });
      }

      if (salon.banned.has(username.toLowerCase()) || salon.banned.has(token))
        return socket.emit("salon_error", {
          message: "L'hôte t'a retiré de ce salon.",
        });

      const taken = salon.players[username];
      if (taken && taken.token !== token)
        return socket.emit("salon_error", {
          message: "Ce pseudo est déjà pris.",
        });

      const late =
        !salon.players[username] &&
        salon.game.phase !== "lobby" &&
        salon.game.phase !== "gameover";
      if (late) addPlayer(salon, username, socket.id).scoreBeforeRound = 0;
      if (salon.players[username]) {
        const existing = salon.players[username];
        // Cancel pending removal timer
        clearTimeout(existing._dcTimer);
        existing._dcTimer = null;
        existing._disconnected = false;
        existing.socketId = socket.id;

        socket.join(`salon:${code}`);
        socket.join(`salon:players:${code}`);
        socket.salonCode = code;
        socket.salonRole = "player";
        socket.salonUsername = username;

        // Build reconnect payload so client can restore its UI
        const reconnectData = {
          username,
          token: existing.token,
          reconnecting: true,
          settings: {
            answerMode: salon.settings.answerMode,
            maxRounds: salon.settings.maxRounds,
          },
          phase: salon.game.phase,
          paused: salon.game.paused,
          round: salon.game.currentRound,
          team: existing.team,
          teams: standings(salon),
          players: getPlayerList(salon),
          score: existing.score,
          foundArtist: existing.foundArtist,
          foundTitle: existing.foundTitle,
          foundFeatCount: existing.foundFeats.filter(Boolean).length,
          foundExtrasCount: existing.foundExtras.filter(Boolean).length,
          allFound: existing._fullFoundCounted,
          timerVal: salon.game.timerValue,
          timerMax: salon.game.timerMax ?? salon.settings.roundDuration,
          timerActive: salon.game.timerActive,
        };
        if (salon.game.phase === "round") {
          reconnectData.extras = (
            salon.game.currentTrack?.extraAnswers || []
          ).map((e) => ({ label: e.label }));
          if (salon.settings.answerMode === "multiple") {
            reconnectData.choices = salon.game.choices;
            reconnectData.featCount =
              salon.game.currentTrack?.featArtists?.length || 0;
          }
        }

        socket.emit("salon_joined", reconnectData);
        broadcastRoster(code, io);
        scheduleCleanup(code);
        return;
      }

      const player = addPlayer(salon, username, socket.id);

      socket.join(`salon:${code}`);
      socket.join(`salon:players:${code}`);
      socket.salonCode = code;
      socket.salonRole = "player";
      socket.salonUsername = username;

      socket.emit("salon_joined", {
        username,
        token: player.token,
        settings: {
          answerMode: salon.settings.answerMode,
          maxRounds: salon.settings.maxRounds,
        },
        team: player.team,
        teams: standings(salon),
        players: getPlayerList(salon),
      });
      broadcastRoster(code, io);
      scheduleCleanup(code);
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
      const code = salon.code;
      clearPause(code, io);

      clearTimeout(salon.game.breakTimer);
      salon.game.breakTimer = null;
      startNextRound(code, io);
    });

    // ── Player submits free text answer ──────────────────────────────────────
    socket.on("salon_submit_guess", ({ guess }) => {
      const code = socket.salonCode;
      const username = socket.salonUsername;
      const salon = salonRooms[code];
      // Pas de réponse avant que la musique joue (chrono lancé)
      if (
        !salon ||
        salon.game.phase !== "round" ||
        salon.game.paused ||
        !salon.game.timerActive
      )
        return;

      const player = salon.players[username];
      if (!player || player._fullFoundCounted) return;
      if (Date.now() - player._lastGuessAt < 300) return;
      player._lastGuessAt = Date.now();

      const track = salon.game.currentTrack;
      const input = cleanString(guess?.slice(0, 100) || "");
      if (!input) return;

      const timeTaken = (Date.now() - salon.game.startTime) / 1000;
      const bonus = calcSpeedBonus(timeTaken);
      let hit = false;

      if (!player.foundArtist) {
        if (checkMatch(input, track.cleanArtist)) {
          player.foundArtist = true;
          player.score += 1 + bonus;
          socket.emit("salon_feedback", {
            type: "success_artist",
            correct: true,
            points: 1 + bonus,
            msg: `Artiste ! (+${1 + bonus} pts)`,
          });
          hit = true;
        } else if (checkClose(input, track.cleanArtist)) {
          socket.emit("salon_feedback", {
            type: "close",
            correct: false,
            points: 0,
            msg: "Tu chauffes sur l'artiste !",
          });
          hit = true;
        }
      }

      if (!hit) {
        for (let fi = 0; fi < track.cleanFeatArtists.length; fi++) {
          if (player.foundFeats[fi]) continue;
          if (checkMatch(input, track.cleanFeatArtists[fi])) {
            player.foundFeats[fi] = true;
            player.score += 1 + bonus;
            socket.emit("salon_feedback", {
              type: "success_feat",
              correct: true,
              points: 1 + bonus,
              msg: `Feat ! (+${1 + bonus} pts)`,
            });
            hit = true;
            break;
          } else if (checkClose(input, track.cleanFeatArtists[fi])) {
            socket.emit("salon_feedback", {
              type: "close",
              correct: false,
              points: 0,
              msg: "Tu chauffes sur le feat !",
            });
            hit = true;
            break;
          }
        }
      }

      if (!hit) {
        if (!player.foundTitle) {
          if (checkMatch(input, track.cleanTitle)) {
            player.foundTitle = true;
            player.score += 1 + bonus;
            socket.emit("salon_feedback", {
              type: "success_title",
              correct: true,
              points: 1 + bonus,
              msg: `Titre ! (+${1 + bonus} pts)`,
            });
            hit = true;
          } else if (checkClose(input, track.cleanTitle)) {
            socket.emit("salon_feedback", {
              type: "close",
              correct: false,
              points: 0,
              msg: "Tu chauffes sur le titre !",
            });
            hit = true;
          }
        }
      }

      if (!hit) {
        for (let ei = 0; ei < (track.extraAnswers || []).length; ei++) {
          if (player.foundExtras[ei]) continue;
          const extra = track.extraAnswers[ei];
          if (checkMatch(input, extra.clean)) {
            player.foundExtras[ei] = true;
            player.score += 1 + bonus;
            socket.emit("salon_feedback", {
              type: "success_extra",
              extraIndex: ei,
              correct: true,
              points: 1 + bonus,
              msg: `${extra.label} ! (+${1 + bonus} pts)`,
            });
            hit = true;
            break;
          } else if (checkClose(input, extra.clean)) {
            socket.emit("salon_feedback", {
              type: "close",
              correct: false,
              points: 0,
              msg: `Tu chauffes sur ${extra.label} !`,
            });
            hit = true;
            break;
          }
        }
      }

      if (!hit) {
        socket.emit("salon_feedback", {
          type: "miss",
          correct: false,
          points: 0,
          msg: "Pas du tout…",
        });
      }

      // Check if fully found now
      if (playerFullyFound(player, track) && !player._fullFoundCounted) {
        player._fullFoundCounted = true;
        if (!salon.game.firstFinder) salon.game.firstFinder = username;
      }

      // Notify host on every hit with full found state
      if (hit) {
        staff(code, io).emit("salon_player_answered", {
          username,
          correct: player._fullFoundCounted,
          foundArtist: player.foundArtist,
          foundTitle: player.foundTitle,
          foundFeatCount: player.foundFeats.filter(Boolean).length,
          totalFeatCount: track.cleanFeatArtists?.length || 0,
        });
      }

      // Broadcast updated scores
      io.to(`salon:${code}`).emit("salon_scores_update", {
        scores: sortedScores(salon),
        teams: standings(salon),
      });

      checkEveryoneDone(code, io);
    });

    // ── Player submits multiple choice ────────────────────────────────────────
    socket.on("salon_submit_choice", ({ choiceIndex }) => {
      const code = socket.salonCode;
      const username = socket.salonUsername;
      const salon = salonRooms[code];
      // Pas de réponse avant que la musique joue (chrono lancé)
      if (
        !salon ||
        salon.game.phase !== "round" ||
        salon.game.paused ||
        !salon.game.timerActive
      )
        return;

      const player = salon.players[username];
      if (!player || player._fullFoundCounted) return;

      const game = salon.game;
      const timeTaken = (Date.now() - game.startTime) / 1000;

      // Store choice for deferred scoring at round end (Kahoot-style suspense)
      player._choiceIndex = choiceIndex;
      player._choiceTimeTaken = timeTaken;
      player._fullFoundCounted = true; // block re-submission

      // Notify host that player has answered — but NOT whether it's correct
      staff(code, io).emit("salon_player_answered", {
        username,
        answered: true,
        // foundArtist/foundTitle intentionally omitted — reveal at round end
        totalFeatCount: game.currentTrack?.cleanFeatArtists?.length || 0,
      });

      // Scores are NOT updated here — deferred to endRound
      checkEveryoneDone(code, io);
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

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const code = socket.salonCode;
      if (!code) return;
      const salon = salonRooms[code];
      if (!salon) return;

      if (socket.salonRole === "screen" || socket.salonRole === "control") {
        // Un écran de moins : la régie doit le voir tout de suite.
        if (socket.salonRole === "screen") broadcastScreens(code, io);
        // Le salon ferme quand plus aucun écran ni régie n'est connecté
        const rooms = io.sockets.adapter.rooms;
        const left =
          (rooms.get(`salon:screens:${code}`)?.size ?? 0) +
          (rooms.get(`salon:ctrl:${code}`)?.size ?? 0);
        if (left > 0) return;
        clearTimeout(salon._hostDcTimer);
        salon._hostDcTimer = setTimeout(() => {
          cleanupNow(code, io);
        }, HOST_RECONNECT_GRACE);
      } else if (socket.salonRole === "player") {
        const username = socket.salonUsername;
        if (!username || !salon.players[username]) return;

        const player = salon.players[username];
        // Ce téléphone a déjà été remplacé par une reconnexion
        if (player.socketId !== socket.id) return;

        // During lobby: remove immediately (they can re-enter with same name)
        if (salon.game.phase === "lobby") {
          delete salon.players[username];
          broadcastRoster(code, io);
          return;
        }

        // During game: keep score/state, give them 90s to reconnect
        player._disconnected = true;
        player.socketId = null;

        broadcastRoster(code, io);

        // Check if their absence unblocks round end
        checkEveryoneDone(code, io);

        player._dcTimer = setTimeout(() => {
          const s = salonRooms[code];
          if (!s?.players[username]) return;
          delete s.players[username];
          broadcastRoster(code, io);
        }, PLAYER_RECONNECT_GRACE);
      }
    });
  });
}
