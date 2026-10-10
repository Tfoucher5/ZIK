import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../config.js", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null }) }),
        in: async () => ({ data: [] }),
      }),
      insert: () => ({
        select: () => ({ single: async () => ({ data: { id: "g1" } }) }),
        then: (r) => r({ error: null }),
      }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
    rpc: async () => ({ data: null, error: null }),
  },
  getAdminClient: () => ({ rpc: async () => ({ error: null }) }),
}));
vi.mock("../../youtube.js", () => ({ YouTube: { search: async () => [] } }));

const { salonRooms } = await import("../../state.js");
const { registerSalon } = await import("../salon.js");

const CODE = "SCORE1";
const CLE = "cle-admin";

function makeIo() {
  const rooms = new Map();
  let onConnection = null;
  const io = {
    on: (evt, fn) => {
      if (evt === "connection") onConnection = fn;
    },
    to: () => ({ emit: () => {} }),
    sockets: { adapter: { rooms }, sockets: new Map() },
  };
  return { io, rooms, connecte: (s) => onConnection(s) };
}

function makeSocket(id, rooms) {
  const handlers = {};
  return {
    id,
    handlers,
    on(evt, fn) {
      handlers[evt] = fn;
    },
    emit() {},
    join(r) {
      if (!rooms.has(r)) rooms.set(r, new Set());
      rooms.get(r).add(id);
    },
    leave(r) {
      rooms.get(r)?.delete(id);
    },
  };
}

/** Le salon est en Pro : l'ajustement de score est une fonction Pro. */
function salonDeTest() {
  salonRooms[CODE] = {
    code: CODE,
    adminKey: CLE,
    pro: true,
    hostUserId: null,
    origin: null,
    _hostDcTimer: null,
    _cleanupTimer: null,
    settings: { maxRounds: 10, roundDuration: 30, playlistIds: [] },
    players: {
      Mehdi: {
        username: "Mehdi",
        socketId: "s2",
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
        token: "tok2",
        _lastGuessAt: 0,
      },
      Camille: {
        username: "Camille",
        socketId: "s1",
        score: 120,
        foundArtist: false,
        foundTitle: false,
        foundFeats: [],
        foundExtras: [],
        _fullFoundCounted: false,
        _choiceIndex: null,
        _choiceTimeTaken: null,
        team: null,
        stats: { found: 0, first: 0 },
        token: "tok",
        _lastGuessAt: 0,
      },
    },
    banned: new Set(),
    game: {
      phase: "lobby",
      currentRound: 0,
      sessionPlaylist: [],
      fullPlaylist: [],
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
}

describe("changement du nombre d'équipes", () => {
  let h, regie;

  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    salonDeTest();
    h = makeIo();
    registerSalon(h.io);
    regie = makeSocket("regie", h.rooms);
    h.connecte(regie);
    regie.handlers.salon_join_control({ code: CODE, key: CLE });
  });

  const noms = () =>
    salonRooms[CODE].settings.teams?.map((t) => t.name) ?? null;
  const regle = (patch) => regie.handlers.salon_update_settings(patch);

  it("conserve les noms personnalisés quand on ajoute des équipes", () => {
    regle({ teamCount: 2 });
    regie.handlers.salon_rename_team({ team: 0, name: "Les Bretons" });
    expect(noms()).toEqual(["Les Bretons", "Bleue"]);

    regle({ teamCount: 4 });
    expect(noms()).toEqual(["Les Bretons", "Bleue", "Jaune", "Verte"]);
  });

  it("ne déplace personne quand on ajoute une équipe", () => {
    regle({ teamCount: 2 });
    const p = salonRooms[CODE].players;
    // Placements choisis à la main : par le joueur sur son téléphone, ou par
    // l'hôte depuis la régie.
    p.Camille.team = 1;
    p.Mehdi.team = 1;

    regle({ teamCount: 4 });
    expect(p.Camille.team).toBe(1);
    expect(p.Mehdi.team).toBe(1);
  });

  it("libère ceux dont l'équipe disparaît, sans toucher aux autres", () => {
    regle({ teamCount: 4 });
    const p = salonRooms[CODE].players;
    p.Camille.team = 0;
    p.Mehdi.team = 3;

    regle({ teamCount: 2 });
    expect(p.Camille.team).toBe(0);
    expect(p.Mehdi.team).toBeNull();
  });

  it("conserve les noms restants quand on retire des équipes", () => {
    regle({ teamCount: 4 });
    regie.handlers.salon_rename_team({ team: 1, name: "Table du fond" });
    regle({ teamCount: 2 });
    expect(noms()).toEqual(["Rouge", "Table du fond"]);
  });
});

describe("ajustement du score d'un joueur", () => {
  let h, regie;

  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    salonDeTest();
    h = makeIo();
    registerSalon(h.io);
    regie = makeSocket("regie", h.rooms);
    h.connecte(regie);
    regie.handlers.salon_join_control({ code: CODE, key: CLE });
  });

  const score = () => salonRooms[CODE].players.Camille.score;
  const envoie = (payload) => regie.handlers.salon_adjust_score(payload);

  it("applique un delta, comme avant", () => {
    envoie({ username: "Camille", delta: 100 });
    expect(score()).toBe(220);
  });

  it("ne descend pas sous zéro", () => {
    envoie({ username: "Camille", delta: -500 });
    expect(score()).toBe(0);
  });

  it("fixe une valeur absolue, hors de portée d'un delta plafonné", () => {
    envoie({ username: "Camille", score: 1500 });
    expect(score()).toBe(1500);
  });

  it("accepte zéro en valeur absolue", () => {
    envoie({ username: "Camille", score: 0 });
    expect(score()).toBe(0);
  });

  it("arrondit et refuse une valeur absolue négative", () => {
    envoie({ username: "Camille", score: 42.7 });
    expect(score()).toBe(43);
    envoie({ username: "Camille", score: -10 });
    expect(score()).toBe(43);
  });

  it("refuse une valeur absurde", () => {
    envoie({ username: "Camille", score: 10_000_000 });
    expect(score()).toBe(120);
  });

  it("ignore un joueur inconnu", () => {
    envoie({ username: "Inconnu", score: 900 });
    expect(score()).toBe(120);
  });
});
