import { describe, it, expect, beforeEach, vi } from "vitest";

const calls = [];
let reponse = { data: null, error: null };
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => ({
    rpc: async (fn, args) => {
      calls.push([fn, args]);
      if (reponse === "panne") throw new Error("fetch failed");
      return reponse;
    },
  }),
}));

const { salonRooms } = await import("../../../state.js");
const {
  serializeSalon,
  reviveSalon,
  saveSnapshot,
  restoreSalon,
  freezeAndSaveAll,
} = await import("../snapshot.js");
const { addPlayer, broadcastRoster } = await import("../players.js");
const { departPlayer } = await import("../departed.js");
const { timerClock } = await import("../timers.js");

const io = { to: () => ({ emit: () => {} }) };
const titres = Array.from({ length: 4 }, (_, i) => ({
  id: `t${i}`,
  title: `Titre ${i}`,
  artist: "A",
}));
// Comme la base : l'instantané revient en JSON
const viaBase = (salon) => JSON.parse(JSON.stringify(serializeSalon(salon)));

// Salon en pleine manche 2, avec tout ce que l'état peut contenir
function salonEnManche() {
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

function nettoie(salon) {
  clearTimeout(salon._hostDcTimer);
  clearTimeout(salon._cleanupTimer);
  clearInterval(salon.game.interval);
  clearTimeout(salon.game.musicReadyTimer);
  for (const p of Object.values(salon.players)) clearTimeout(p._dcTimer);
}

beforeEach(() => {
  calls.length = 0;
  reponse = { data: null, error: null };
  for (const k of Object.keys(salonRooms)) delete salonRooms[k];
});

describe("instantané d'un salon", () => {
  it("tout l'état passe en JSON, sans timers, sockets ni caches", () => {
    const salon = salonEnManche();
    const data = serializeSalon(salon);
    nettoie(salon);
    // Une Map ou un timer oublié ne survivrait pas à l'aller-retour
    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
    expect(data._hostDcTimer).toBeUndefined();
    expect(data._coalesce).toBeUndefined();
    expect(data.game.interval).toBeUndefined();
    expect(data.game.videos).toBeUndefined();
    expect(data.players.Ana._dcTimer).toBeUndefined();
    expect(data.banned).toEqual(["troll", "jeton-banni"]);
    expect(Object.values(data.departed)[0]).toMatchObject({
      username: "Zoe",
      score: 80,
    });
  });

  it("si l'hôte avait mis en pause, la pause est gardée et rien ne repart seul", () => {
    const salon = salonEnManche();
    salon.game.paused = true;
    const revu = reviveSalon(viaBase(salon));
    nettoie(salon);
    expect(revu.game).toMatchObject({ phase: "summary", paused: true });
    expect(revu.game.restored).toBeUndefined();
  });

  it("une manche coupée est rejouée au retour de la TV, scores d'avant la manche", () => {
    const salon = salonEnManche();
    const revu = reviveSalon(viaBase(salon));
    nettoie(salon);
    const g = revu.game;
    expect(g).toMatchObject({
      phase: "summary",
      paused: false,
      restored: "manche",
      currentRound: 1,
    });
    expect(g.timerActive).toBe(false);
    // Plus d'heure de fin : les écrans ne comptent pas, la reprise relance la manche
    expect(timerClock(g).endsAt).toBeNull();
    expect(g.interval).toBeNull();
    expect(revu.banned.has("troll")).toBe(true);
    expect(revu.players.Ana).toMatchObject({ score: 300, night: 900, team: 0 });
    // Parti pendant la manche coupée : ses points de la manche sautent aussi
    expect(Object.values(revu.departed)[0].score).toBe(50);
    // Le titre coupé repasse en tête (pop prend la fin de la liste)
    expect(g.sessionPlaylist.at(-1).id).toBe("t1");
    expect(g.played.map((t) => t.id)).toEqual(["t0"]);
    // Mêmes objets que fullPlaylist : session.js compare par identité
    expect(g.played[0]).toBe(g.fullPlaylist[0]);
    expect(g.sessionPlaylist[0]).toBe(g.fullPlaylist[3]);
    expect(g.currentTrack).toBe(g.fullPlaylist[1]);
    // Vidéo déjà trouvée : pas de nouvelle recherche YouTube
    expect(g.videos.get(g.fullPlaylist[1])).toEqual({ id: "v1" });
  });

  it("coupure pendant la recherche de la vidéo : la manche est aussi rejouée", () => {
    const salon = salonEnManche();
    salon.game.phase = "summary"; // startNextRound attend encore resolveMedia
    const revu = reviveSalon(viaBase(salon));
    nettoie(salon);
    expect(revu.game.currentRound).toBe(1);
    expect(revu.game.played.map((t) => t.id)).toEqual(["t0"]);
  });

  it("deux titres au même id restent distincts", () => {
    const salon = salonEnManche();
    const g = salon.game;
    g.fullPlaylist[2].id = g.fullPlaylist[3].id = "doublon";
    const revu = reviveSalon(viaBase(salon));
    nettoie(salon);
    expect(revu.game.sessionPlaylist[0]).toBe(revu.game.fullPlaylist[3]);
    expect(revu.game.sessionPlaylist[1]).toBe(revu.game.fullPlaylist[2]);
  });

  it("le lobby et le podium reviennent tels quels", () => {
    for (const phase of ["lobby", "gameover"]) {
      const salon = salonEnManche();
      salon.game.phase = phase;
      salon.game.history.push({ answer: "x" });
      const revu = reviveSalon(viaBase(salon));
      nettoie(salon);
      expect(revu.game).toMatchObject({
        phase,
        paused: false,
        currentRound: 2,
      });
      expect(revu.players.Ana.score).toBe(450);
    }
  });

  it("une base injoignable ne lève jamais", async () => {
    reponse = "panne";
    const salon = salonEnManche();
    await expect(saveSnapshot(salon)).resolves.toBeNull();
    nettoie(salon);
  });
});

describe("reprise à la demande", () => {
  it("reprend un salon absent de la mémoire, une seule lecture pour deux écrans", async () => {
    vi.useFakeTimers();
    try {
      const salon = salonEnManche();
      reponse = {
        data: [{ code: "SNAP01", data: viaBase(salon) }],
        error: null,
      };
      nettoie(salon);
      await Promise.all([
        restoreSalon("SNAP01", io, {}),
        restoreSalon("SNAP01", io, {}),
      ]);
      const lectures = calls.filter(([fn]) => fn === "load_salon_snapshot");
      expect(lectures).toHaveLength(1);
      const revu = salonRooms.SNAP01;
      expect(revu.adminKey).toBe("cle");
      expect(revu.players.Ana).toMatchObject({
        _disconnected: true,
        socketId: null,
      });

      // Personne ne revient : les joueurs passent dans les partis, score gardé
      vi.advanceTimersByTime(10 * 60_000 + 1000);
      expect(revu.players.Ana).toBeUndefined();
      expect(Object.values(revu.departed).map((d) => d.username)).toEqual([
        "Zoe",
        "Ana",
        "Bob",
      ]);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it("sans instantané ou instantané illisible, rien n'est créé", async () => {
    await restoreSalon("ABSENT", io, {});
    expect(salonRooms.ABSENT).toBeUndefined();
    reponse = { data: [{ code: "ABSENT", data: { code: "ABSENT" } }] };
    await restoreSalon("ABSENT", io, {});
    expect(salonRooms.ABSENT).toBeUndefined();
  });

  it("un client qui essaie des codes au hasard est vite ignoré", async () => {
    const socket = {};
    for (let i = 0; i < 12; i++) await restoreSalon(`HASARD${i}`, io, socket);
    expect(calls).toHaveLength(5);
    // Un autre client (TV qui se reconnecte) n'est pas concerné
    await restoreSalon("HASARD0", io, {});
    expect(calls).toHaveLength(6);
  });
});

describe("sauvegardes", () => {
  it("un changement de joueurs est sauvegardé, au plus une fois par seconde", () => {
    vi.useFakeTimers();
    try {
      const salon = salonEnManche();
      salonRooms[salon.code] = salon;
      for (let i = 0; i < 5; i++) broadcastRoster(salon.code, io);
      const saves = () =>
        calls.filter(([fn]) => fn === "save_salon_snapshot").length;
      expect(saves()).toBe(1);
      vi.advanceTimersByTime(1100);
      expect(saves()).toBe(2);
      nettoie(salon);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  // En dernier : après le gel, saveSnapshot ne fait plus rien
  it("SIGTERM : les chronos s'arrêtent, puis plus aucune autre écriture", async () => {
    vi.useFakeTimers();
    try {
      const salon = salonEnManche();
      salonRooms[salon.code] = salon;
      let ticks = 0;
      clearInterval(salon.game.interval);
      salon.game.interval = setInterval(() => ticks++, 1000);
      await freezeAndSaveAll();
      vi.advanceTimersByTime(5000);
      expect(ticks).toBe(0);
      expect(salon.game.interval).toBeNull();
      const saves = () => calls.filter(([fn]) => fn === "save_salon_snapshot");
      expect(saves().map(([, a]) => a.p_code)).toEqual(["SNAP01"]);
      await saveSnapshot(salon);
      expect(saves()).toHaveLength(1);
      nettoie(salon);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});
