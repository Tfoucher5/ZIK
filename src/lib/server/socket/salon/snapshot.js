import { getAdminClient } from "../../config.js";
import { salonRooms } from "../../state.js";
import { noteEvent } from "../../services/health/opsEvents.js";
import { scheduleDeparture } from "./leave.js";
import { scheduleCleanup } from "./timers.js";
import { nextRound } from "./rounds.js";

// Instantané d'un salon dans Postgres (salon.snapshots) : écrit à chaque
// changement de phase, de joueurs ou de réglages et sur SIGTERM, relu quand un
// écran ou un téléphone rejoint un code absent de la mémoire (déploiement, crash).

// Timers de game recréés au réveil ; le cache des vidéos (Map indexée par
// titre) part à part, dans refs
const SKIP = [
  "interval",
  "breakTimer",
  "musicReadyTimer",
  "outageTimer",
  "videos",
];
// Entracte de 2 h compris : au-delà, la soirée est finie
const MAX_AGE_S = 2 * 60 * 60;
// Un client qui tape des codes au hasard ne doit pas marteler la base
const MAX_MISSES = 5;
const MISS_WINDOW_MS = 60 * 1000;
const SIGTERM_BUDGET_MS = 5000;
// Le temps de lire « mise à jour terminée » sur la TV avant que ça reparte
const RESUME_DELAY_MS = 5000;

const plain = (o) =>
  Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith("_")));

// Copie de surface : les titres partent par référence, supabase-js ne
// sérialise qu'une fois
export function serializeSalon(salon) {
  const g = salon.game;
  const game = plain(g);
  for (const k of SKIP) delete game[k];
  // session.js compare les titres par identité : on note leur place dans
  // fullPlaylist pour relier les copies au réveil (deux titres peuvent avoir
  // le même id)
  const at = (t) => g.fullPlaylist.indexOf(t);
  game.refs = {
    session: g.sessionPlaylist.map(at),
    played: g.played.map(at),
    current: g.currentTrack ? at(g.currentTrack) : -1,
    // Vidéos trouvées pendant la soirée : pas de nouvelle recherche YouTube
    // après une reprise
    videos: [...(g.videos ?? [])].map(([t, v]) => [at(t), v]),
  };
  const players = {};
  for (const [u, p] of Object.entries(salon.players)) players[u] = plain(p);
  return { ...plain(salon), banned: [...salon.banned], players, game };
}

export function reviveSalon(data) {
  const salon = {
    ...data,
    banned: new Set(data.banned ?? []),
    _hostDcTimer: null,
    _cleanupTimer: null,
  };
  const game = salon.game;
  const { refs } = game;
  delete game.refs;
  const link = (copy, i) => game.fullPlaylist[i] ?? copy;
  game.sessionPlaylist = game.sessionPlaylist.map((t, k) =>
    link(t, refs.session[k]),
  );
  game.played = game.played.map((t, k) => link(t, refs.played[k]));
  if (game.currentTrack)
    game.currentTrack = link(game.currentTrack, refs.current);
  const videos = (refs.videos ?? []).filter(([i]) => game.fullPlaylist[i]);
  if (videos.length)
    game.videos = new Map(videos.map(([i, v]) => [game.fullPlaylist[i], v]));
  Object.assign(game, {
    interval: null,
    breakTimer: null,
    musicReadyTimer: null,
    outageTimer: null,
    timerActive: false,
    buzzer: null,
    videoOutage: null,
  });
  // Manche coupée, même pendant la recherche de sa vidéo (phase pas encore
  // « round ») : elle est rejouée, son titre repasse en tête de la session
  if (game.currentRound > game.history.length) {
    if (game.currentTrack && game.played.at(-1) === game.currentTrack) {
      game.played.pop();
      game.sessionPlaylist.push(game.currentTrack);
    }
    game.currentRound = game.history.length;
    game.prefetchedRound = null;
    const partis = Object.values(salon.departed ?? {});
    for (const p of [...Object.values(salon.players), ...partis])
      if (p.inGame !== false) p.score = p.scoreBeforeRound ?? p.score;
    game.phase = "summary";
    // Repart seule au retour de la TV (resumeAfterRestart), sauf si l'hôte
    // avait mis en pause
    if (!game.paused) game.restored = "manche";
  } else if (game.phase === "summary" && !game.paused) {
    game.restored = "resume";
  }
  return salon;
}

// La TV est revenue après un redémarrage : tout le monde voit ce qui se passe
// et la manche coupée repart seule
export function resumeAfterRestart(salon, io) {
  const { code, game } = salon;
  const replay = game.restored === "manche" || !salon.settings.manualNext;
  delete game.restored;
  // La régie a déjà relancé ou mis en pause avant le retour de la TV : on
  // ne touche à rien
  if (game.phase !== "summary" || game.paused) return;
  io.to(`salon:${code}`).emit("salon_restored", {
    resumeIn: replay ? RESUME_DELAY_MS / 1000 : null,
  });
  if (!replay) return;
  clearTimeout(game.breakTimer);
  game.breakTimer = setTimeout(() => {
    game.breakTimer = null;
    nextRound(code, io);
  }, RESUME_DELAY_MS);
}

// Jamais bloquant ni levant : une base injoignable ne doit pas gêner la manche
async function rpc(what, fn, args) {
  try {
    const { data, error } = await getAdminClient().rpc(fn, args);
    if (error) throw error;
    return data;
  } catch (e) {
    console.error(`[salon] ${what}:`, e?.message ?? e);
    if (fn === "save_salon_snapshot") noteEvent("snapshot_failed");
    return null;
  }
}

// Après le gel du SIGTERM, plus aucune écriture ne part en course avec la sienne
let stopping = false;

export function saveSnapshot(salon) {
  if (stopping) return Promise.resolve(null);
  return rpc("instantané", "save_salon_snapshot", {
    p_code: salon.code,
    p_data: serializeSalon(salon),
  });
}

// SIGTERM : plus rien ne bouge (chronos, enchaînements) pendant la sauvegarde,
// bornée pour ne pas attendre le SIGKILL si la base ne répond pas
export function freezeAndSaveAll() {
  for (const salon of Object.values(salonRooms)) {
    const g = salon.game;
    clearInterval(g.interval);
    for (const t of ["breakTimer", "musicReadyTimer", "outageTimer"])
      clearTimeout(g[t]);
    g.interval = g.breakTimer = g.musicReadyTimer = g.outageTimer = null;
  }
  const saves = Object.values(salonRooms).map(saveSnapshot);
  stopping = true;
  return Promise.race([
    Promise.all(saves),
    new Promise((r) => setTimeout(r, SIGTERM_BUDGET_MS)),
  ]);
}

export function dropSnapshot(code) {
  return rpc("suppression instantané", "delete_salon_snapshot", {
    p_code: code,
  });
}

// Au démarrage : les instantanés de plus d'un jour (crash sans reprise)
export function purgeSnapshots() {
  return rpc("purge instantanés", "purge_salon_snapshots", {});
}

const pending = {};

// Salon absent de la mémoire : repris depuis son instantané s'il en a un.
// Deux écrans qui arrivent ensemble attendent la même lecture.
export async function restoreSalon(code, io, socket) {
  const misses = (socket._restoreMisses ??= []);
  const now = Date.now();
  while (misses.length && now - misses[0] > MISS_WINDOW_MS) misses.shift();
  // « throttled » : on n'a pas regardé, ce n'est pas un salon fermé
  if (misses.length >= MAX_MISSES) return "throttled";
  await (pending[code] ??= load(code, io).finally(() => delete pending[code]));
  if (!salonRooms[code]) misses.push(now);
}

async function load(code, io) {
  const rows = await rpc("reprise", "load_salon_snapshot", {
    p_code: code,
    p_max_age_seconds: MAX_AGE_S,
  });
  if (!rows?.[0] || salonRooms[code]) return;
  try {
    const salon = reviveSalon(rows[0].data);
    salonRooms[code] = salon;
    for (const username of Object.keys(salon.players))
      scheduleDeparture(salon, username, io);
    scheduleCleanup(code);
    console.log(`Salon "${code}" repris depuis son instantané`);
  } catch (e) {
    delete salonRooms[code];
    console.error("[salon] instantané illisible:", e?.message ?? e);
  }
}
