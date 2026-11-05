import { serializeSalon, reviveSalon } from "../snapshot.js";
import { addPlayer } from "../players.js";
import { departPlayer } from "../departed.js";

// Salon de test des instantanés (snapshot*.test.js)
export const titres = Array.from({ length: 4 }, (_, i) => ({
  id: `t${i}`,
  title: `Titre ${i}`,
  artist: "A",
}));
// Comme la base : l'instantané et sa ligne de titres reviennent en JSON
export const json = (o) => JSON.parse(JSON.stringify(o));
export const viaBase = (salon) => {
  salon._playlistAt ??= 1;
  return json(serializeSalon(salon));
};
export const titresDe = (salon) =>
  json({ at: salon._playlistAt, tracks: salon.game.fullPlaylist });
export const revive = (salon) => reviveSalon(viaBase(salon), titresDe(salon));

// Salon en pleine manche 2, avec tout ce que l'état peut contenir
export function salonEnManche() {
  const full = titres.map((t) => ({ ...t }));
  const salon = {
    code: "SNAP01",
    adminKey: "cle",
    pro: true,
    hostUserId: null,
    origin: "site",
    _hostDcTimer: setTimeout(() => {}, 1e6),
    _cleanupTimer: setTimeout(() => {}, 1e6),
    _coalesce: {},
    settings: {
      maxRounds: 4,
      roundDuration: 30,
      teams: [{ id: 0, name: "R" }],
    },
    players: {},
    banned: new Set(["troll", "jeton-banni"]),
    nightGames: 1,
    game: {
      phase: "round",
      currentRound: 2,
      fullPlaylist: full,
      sessionPlaylist: [full[3], full[2]],
      played: [full[0], full[1]],
      currentTrack: full[1],
      currentVideo: { id: "v1", start: 0, audio: false },
      interval: setInterval(() => {}, 1e6),
      breakTimer: null,
      musicReadyTimer: setTimeout(() => {}, 1e6),
      outageTimer: null,
      videos: new Map([[full[1], { id: "v1" }]]),
      timerActive: true,
      timerValue: 12,
      endsAt: 1_000_000,
      remainingMs: 12_000,
      history: [{ answer: "A - Titre 0", cover: null }],
      paused: false,
      dbGameId: "g1",
    },
  };
  const ana = addPlayer(salon, "Ana", "s1");
  Object.assign(ana, {
    team: 0,
    score: 450,
    scoreBeforeRound: 300,
    night: 900,
  });
  ana._dcTimer = setTimeout(() => {}, 1e6);
  addPlayer(salon, "Bob", "s2").score = 100;
  salon.players.Bob.scoreBeforeRound = 100;
  Object.assign(addPlayer(salon, "Zoe", "s3"), {
    score: 80,
    scoreBeforeRound: 50,
  });
  departPlayer(salon, "Zoe");
  return salon;
}

export function nettoie(salon) {
  clearTimeout(salon._hostDcTimer);
  clearTimeout(salon._cleanupTimer);
  clearInterval(salon.game.interval);
  clearTimeout(salon.game.musicReadyTimer);
  for (const p of Object.values(salon.players)) clearTimeout(p._dcTimer);
}
