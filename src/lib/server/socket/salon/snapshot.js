import { getAdminClient } from "../../config.js";
import { salonRooms } from "../../state.js";
import { noteEvent } from "../../services/health/opsEvents.js";
import { scheduleDeparture } from "./leave.js";
import { nextRound, scheduleCleanup } from "./timers.js";

// Instantané d'un salon dans Postgres (salon.snapshots) : écrit à chaque
// changement de phase, de joueurs ou de réglages et sur SIGTERM, relu quand un
// écran ou un téléphone rejoint un code absent de la mémoire (déploiement, crash).
// La playlist entière (jusqu'à plusieurs Mo) part dans une ligne à part,
// « <code>:titres », réécrite seulement quand elle change : la réécrire à chaque
// sauvegarde a saturé les écritures de la base le 05/11/2026.

// Timers de game recréés au réveil ; le cache des vidéos (Map indexée par
// titre) part à part, dans refs
const SKIP = [
  "interval",
  "breakTimer",
  "musicReadyTimer",
  "outageTimer",
  "videos",
  "fullPlaylist",
];
const TITRES = ":titres";
// La ligne des titres est rafraîchie pour ne pas expirer avant celle de l'état
const PLAYLIST_REFRESH_MS = 30 * 60 * 1000;
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
    playlist: salon._playlistAt ?? null,
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

// Copie du dernier titre joué = titre en cours : la manche coupée est rejouée
const sameCopy = (last, current) =>
  last && JSON.stringify(last) === JSON.stringify(current) ? last : current;

// Sans sa ligne de titres (ou avec une autre version), le salon repart avec
// les titres de la soirée, copiés dans l'état
export function reviveSalon(data, playlist = null) {
  const salon = {
    ...data,
    banned: new Set(data.banned ?? []),
    _hostDcTimer: null,
    _cleanupTimer: null,
  };
  const game = salon.game;
  const { refs } = game;
  delete game.refs;
  // Instantané écrit avant la 3.23.1 : la playlist est encore dans l'état
  const legacy =
    Array.isArray(game.fullPlaylist) && refs.playlist === undefined;
  const fresh = playlist?.at != null && playlist.at === refs.playlist;
  const same = legacy || fresh;
  if (!legacy)
    game.fullPlaylist = fresh
      ? playlist.tracks
      : [...new Set([...game.played, ...game.sessionPlaylist])];
  if (fresh) {
    salon._savedPlaylist = game.fullPlaylist;
    salon._playlistAt = playlist.at;
  }
  const link = (copy, i) => (same && game.fullPlaylist[i]) || copy;
  game.sessionPlaylist = game.sessionPlaylist.map((t, k) =>
    link(t, refs.session[k]),
  );
  game.played = game.played.map((t, k) => link(t, refs.played[k]));
  if (game.currentTrack)
    game.currentTrack =
      same && refs.current >= 0
        ? link(game.currentTrack, refs.current)
        : sameCopy(game.played.at(-1), game.currentTrack);
  const videos = same
    ? (refs.videos ?? []).filter(([i]) => game.fullPlaylist[i])
    : [];
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
async function rpc(what, fn, args, onFail) {
  try {
    const { data, error } = await getAdminClient()
      .schema("salon")
      .rpc(fn, args);
    if (error) throw error;
    return data;
  } catch (e) {
    console.error(`[salon] ${what}:`, e?.message ?? e);
    onFail?.();
    return null;
  }
}

// Après le gel du SIGTERM, plus aucune écriture ne part en course avec la sienne
let stopping = false;

export function saveSnapshot(salon) {
  if (stopping || salon._closed) return Promise.resolve(null);
  const tracks = salon.game.fullPlaylist;
  const now = Date.now();
  if (
    salon._savedPlaylist !== tracks ||
    now - salon._playlistAt >= PLAYLIST_REFRESH_MS
  ) {
    salon._savedPlaylist = tracks;
    salon._playlistAt = now;
    // Écritures des titres à la file : une ancienne version (plusieurs Mo)
    // ne doit pas arriver après la nouvelle
    salon._titresWrite = (salon._titresWrite ?? Promise.resolve()).then(() =>
      rpc(
        "titres de l'instantané",
        "save_salon_snapshot",
        { p_code: salon.code + TITRES, p_data: { at: now, tracks } },
        () => {
          if (salon._playlistAt === now) salon._savedPlaylist = null;
        },
      ),
    );
  }
  const etat = rpc(
    "instantané",
    "save_salon_snapshot",
    { p_code: salon.code, p_data: serializeSalon(salon) },
    () => noteEvent("snapshot_failed"),
  );
  // SIGTERM attend aussi les titres : sinon l'état pointerait vers une
  // version jamais écrite
  const save = Promise.all([salon._titresWrite, etat]).then(([, r]) => r);
  // dropSnapshot attend toutes les écritures en vol, pas seulement la dernière
  salon._saves = Promise.all([salon._saves, save]).then(() => {});
  return save;
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
    Promise.all([...saves, ...Object.values(closing)]),
    new Promise((r) => setTimeout(r, SIGTERM_BUDGET_MS)),
  ]);
}

// Salons fermés dont l'instantané n'est pas encore effacé : une reprise attend
// la fin de l'effacement, sinon le salon renaîtrait
const closing = {};

// L'effacement passe après les sauvegardes encore en vol : l'une d'elles
// réécrirait sinon l'instantané d'un salon fermé
export function dropSnapshot(code, salon) {
  if (salon) salon._closed = true;
  const done = Promise.resolve(salon?._saves)
    .then(() =>
      Promise.all(
        [code, code + TITRES].map((p_code) =>
          rpc("suppression instantané", "delete_salon_snapshot", { p_code }),
        ),
      ),
    )
    .finally(() => {
      if (closing[code] === done) delete closing[code];
    });
  closing[code] = done;
  return done;
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
  if (code.endsWith(TITRES)) return;
  await closing[code];
  await (pending[code] ??= load(code, io).finally(() => delete pending[code]));
  if (!salonRooms[code]) misses.push(now);
}

async function load(code, io) {
  const rows = await rpc("reprise", "load_salon_snapshot", {
    p_code: code,
    p_max_age_seconds: MAX_AGE_S,
  });
  if (!rows?.[0] || salonRooms[code]) return;
  const titres = await rpc("reprise des titres", "load_salon_snapshot", {
    p_code: code + TITRES,
    p_max_age_seconds: MAX_AGE_S + PLAYLIST_REFRESH_MS / 1000,
  });
  if (salonRooms[code]) return;
  try {
    const salon = reviveSalon(rows[0].data, titres?.[0]?.data);
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
