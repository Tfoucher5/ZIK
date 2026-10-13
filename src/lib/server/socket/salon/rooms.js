import { randomBytes } from "crypto";
import { supabase } from "../../config.js";
import { userClient } from "../../middleware/auth.js";
import { salonRooms, getIO } from "../../state.js";
import { isPro } from "../../services/pro.js";
import { venueOfOwner, salonVenue } from "../../services/venues.js";
import { FREE_MAX_TEAMS } from "../../../proPlans.js";
import { makeTeams } from "./teams.js";
import { loadSalonTracks, buildSessionPlaylist } from "./tracks.js";
import { prefetchNextVideo, prepareSession } from "./session.js";
import { broadcastRoster, teamLimit } from "./players.js";
import { scheduleCleanup } from "./timers.js";
import { startNextRound } from "./rounds.js";

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
  const venue = pro ? salonVenue(await venueOfOwner(hostUserId)) : null;
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
    venue,
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

// Réglages de la régie, aussi appliqués par l'admin. allow(fonction) dit si
// une fonction Pro est permise.
export function applySettings(code, patch, io, allow) {
  const salon = salonRooms[code];
  const s = salon.settings;
  const game = salon.game;
  const idle = game.phase === "lobby" || game.phase === "gameover";
  if (!idle && !allow("liveSettings")) return;
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
    if (patch.teamCount > teamLimit(salon) && !allow("teams")) return;
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
}
