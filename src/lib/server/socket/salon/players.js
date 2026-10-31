import { randomBytes } from "crypto";
import { salonRooms } from "../../state.js";
import { FREE_MAX_TEAMS } from "../../../data/proPlans.js";
import { teamStandings } from "./teams.js";
import { checkEveryoneDone } from "./rounds.js";
import { eveningView } from "./evening.js";

function makePlayer(username, socketId) {
  return {
    username,
    socketId,
    score: 0,
    night: 0,
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

export function addPlayer(salon, username, socketId, token = null) {
  // Pas d'équipe d'office : le joueur la choisit sur son téléphone, ou l'hôte
  // la lui donne depuis la régie. Coller un arrivant dans l'équipe la moins
  // remplie cassait les tables déjà constituées.
  const player = makePlayer(username, socketId);
  // Téléphone resté en veille trop longtemps : il retrouve ses points de soirée
  if (token && salon.nightBank?.[token]) {
    player.night = salon.nightBank[token];
    delete salon.nightBank[token];
  }
  salon.players[username] = player;
  return player;
}

export function getPlayerList(salon) {
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

// Joueur retiré faute de reconnexion : ses points de soirée l'attendent
export function bankNight(salon, player) {
  if (player.night) (salon.nightBank ??= {})[player.token] = player.night;
}

// Classement de la soirée (ZIK Pro) : cumul des parties terminées du salon
export function nightView(salon) {
  if (!salon.pro || !salon.nightGames) return null;
  const players = Object.values(salon.players)
    .map((p) => ({ username: p.username, score: p.night, team: p.team }))
    .sort((a, b) => b.score - a.score);
  return {
    games: salon.nightGames,
    players,
    teams: teamStandings(salon.settings.teams, players),
  };
}

// Reprise après une coupure : de quoi rétablir l'écran du téléphone
export function reconnectView(salon, player) {
  const data = {
    username: player.username,
    token: player.token,
    reconnecting: true,
    settings: {
      answerMode: salon.settings.answerMode,
      maxRounds: salon.settings.maxRounds,
    },
    phase: salon.game.phase,
    paused: salon.game.paused,
    round: salon.game.currentRound,
    team: player.team,
    teams: standings(salon),
    night: nightView(salon),
    evening: eveningView(salon),
    players: getPlayerList(salon),
    score: player.score,
    foundArtist: player.foundArtist,
    foundTitle: player.foundTitle,
    foundFeatCount: player.foundFeats.filter(Boolean).length,
    foundExtrasCount: player.foundExtras.filter(Boolean).length,
    allFound: player._fullFoundCounted,
    timerVal: salon.game.timerValue,
    timerMax: salon.game.timerMax ?? salon.settings.roundDuration,
    timerActive: salon.game.timerActive,
  };
  if (salon.game.phase === "round") {
    data.extras = (salon.game.currentTrack?.extraAnswers || []).map((e) => ({
      label: e.label,
    }));
    if (salon.settings.answerMode === "multiple") {
      data.choices = salon.game.choices;
      data.featCount = salon.game.currentTrack?.featArtists?.length || 0;
    }
  }
  return data;
}

export function standings(salon) {
  return teamStandings(salon.settings.teams, Object.values(salon.players));
}

export function sortedScores(salon) {
  return Object.values(salon.players)
    .map((p) => ({ username: p.username, score: p.score, team: p.team }))
    .sort((a, b) => b.score - a.score);
}

// Écrans TV et régie : tout ce que les joueurs ne doivent pas recevoir
export function staff(code, io) {
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
export function broadcastScreens(code, io) {
  const count =
    io.sockets.adapter.rooms.get(`salon:screens:${code}`)?.size ?? 0;
  io.to(`salon:ctrl:${code}`).emit("salon_screens", { count });
}

// À 200 joueurs, chaque envoi de liste part vers 200 téléphones : au plus un
// envoi par seconde, le dernier état part à la fin de la fenêtre
const COALESCE_MS = 1000;
function coalesce(code, key, send) {
  const salon = salonRooms[code];
  if (!salon) return;
  const waits = (salon._coalesce ??= {});
  if (waits[key]) {
    waits[key].pending = true;
    return;
  }
  send(salon);
  waits[key] = { pending: false };
  setTimeout(() => {
    const again = waits[key].pending;
    delete waits[key];
    if (again && salonRooms[code] === salon) coalesce(code, key, send);
  }, COALESCE_MS);
}

export function broadcastRoster(code, io) {
  coalesce(code, "roster", (salon) =>
    io.to(`salon:${code}`).emit("salon_roster", {
      players: getPlayerList(salon),
      teams: standings(salon),
    }),
  );
}

export function broadcastScores(code, io) {
  coalesce(code, "scores", (salon) =>
    io.to(`salon:${code}`).emit("salon_scores_update", {
      scores: sortedScores(salon),
      teams: standings(salon),
    }),
  );
}

// Fonction ZIK Pro : refusée aux salons gratuits, l'hôte voit l'offre
export function requirePro(socket, salon, feature) {
  if (salon.pro) return true;
  socket.emit("salon_pro_required", { feature });
  return false;
}

export function teamLimit(salon) {
  return salon.pro ? Infinity : FREE_MAX_TEAMS;
}

// Socket de la régie ou d'un écran ouvert avec la clé : seuls à piloter
export function adminSalon(socket) {
  if (!socket.salonAdmin) return null;
  return salonRooms[socket.salonCode] ?? null;
}

export function resetStats(salon) {
  for (const p of Object.values(salon.players)) {
    p.score = 0;
    p.stats = { found: 0, first: 0 };
  }
}

export function resetRoundFlags(salon) {
  for (const p of Object.values(salon.players)) {
    p.scoreBeforeRound = p.score;
    p.foundArtist = false;
    p.foundTitle = false;
    p.foundFeats = [];
    p.foundExtras = [];
    p._fullFoundCounted = false;
    p._choiceIndex = null;
    p._choiceTimeTaken = null;
    p._buzzLocked = false;
  }
}

// Returns true if this player has found everything for the current track
export function playerFullyFound(player, track) {
  const allFeats = (track.cleanFeatArtists || []).every(
    (_, i) => player.foundFeats[i],
  );
  const allExtras = (track.extraAnswers || []).every(
    (_, i) => player.foundExtras[i],
  );
  return player.foundArtist && player.foundTitle && allFeats && allExtras;
}

// Pseudo affiché sur la TV : court, sans caractères invisibles
export function cleanUsername(name) {
  return String(name ?? "")
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .trim()
    .slice(0, 20);
}

export function kickPlayer(salon, username, io) {
  const player = salon.players[username];
  if (!player) return false;
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
  return true;
}
