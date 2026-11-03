import { describe, it, expect, beforeEach, vi } from "vitest";

// Base simulée : chaque test choisit ce que renvoient les fonctions SQL
const db = vi.hoisted(() => ({ reply: () => ({ data: null, error: null }) }));

// salon.js parle à Supabase et à YouTube dès l'import : on les neutralise,
// ces tests ne portent que sur la diffusion du nombre d'écrans connectés.
vi.mock("../../../config.js", () => ({
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
  getAdminClient: () => ({
    rpc: async (fn, args) => db.reply(fn, args),
    from: () => ({ insert: () => ({ then: (r) => r({ error: null }) }) }),
  }),
}));
vi.mock("../../game/audio.js", () => ({
  ytsQuery: async () => ({ results: [], autoIndex: -1 }),
  ytVideoInfo: async () => null,
}));

const { salonRooms } = await import("../../../state.js");
const { registerSalon } = await import("../index.js");
const { getPlayerList, nightView } = await import("../players.js");
const { serializeSalon } = await import("../snapshot.js");

const CODE = "TEST01";
const CLE = "cle-admin";

/**
 * `io` factice. Le harnais de game/core.test.js avale les émissions
 * (`to: () => ({ emit: () => {} })`) ; ici il faut les capturer, et exposer
 * `sockets.adapter.rooms` puisque le compte d'écrans en provient.
 */
function makeIo() {
  const rooms = new Map();
  const emissions = [];
  let onConnection = null;
  const io = {
    on: (evt, fn) => {
      if (evt === "connection") onConnection = fn;
    },
    to: (cible) => ({
      emit: (event, payload) =>
        emissions.push({
          cibles: Array.isArray(cible) ? cible : [cible],
          event,
          payload,
        }),
    }),
    sockets: { adapter: { rooms }, sockets: new Map() },
  };
  return {
    io,
    rooms,
    emissions,
    connecte: (socket) => onConnection(socket),
  };
}

function makeSocket(id, rooms) {
  const handlers = {};
  return {
    id,
    handlers,
    propres: [],
    on(evt, fn) {
      handlers[evt] = fn;
    },
    emit() {},
    join(r) {
      if (!rooms.has(r)) rooms.set(r, new Set());
      rooms.get(r).add(id);
      this.propres.push(r);
    },
    leave(r) {
      rooms.get(r)?.delete(id);
      if (rooms.get(r)?.size === 0) rooms.delete(r);
    },
    deconnecte() {
      for (const r of this.propres) this.leave(r);
      handlers.disconnect?.();
    },
  };
}

function salonDeTest() {
  salonRooms[CODE] = {
    code: CODE,
    adminKey: CLE,
    pro: false,
    hostUserId: null,
    origin: null,
    _hostDcTimer: null,
    _cleanupTimer: null,
    settings: { maxRounds: 10, roundDuration: 30, playlistIds: [] },
    players: {},
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

/** Dernière valeur diffusée sur salon_screens à destination de la régie. */
function dernierCompte(emissions) {
  const vus = emissions.filter(
    (e) =>
      e.event === "salon_screens" &&
      e.cibles.some((c) => c === `salon:ctrl:${CODE}`),
  );
  return vus.length ? vus[vus.length - 1].payload.count : null;
}

describe("diffusion du nombre d'écrans TV", () => {
  let h;

  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    salonDeTest();
    h = makeIo();
    registerSalon(h.io);
  });

  function brancheEcran(id) {
    const s = makeSocket(id, h.rooms);
    h.connecte(s);
    s.handlers.salon_join_host({ code: CODE, key: CLE });
    return s;
  }

  function brancheRegie(id) {
    const s = makeSocket(id, h.rooms);
    h.connecte(s);
    s.handlers.salon_join_control({ code: CODE, key: CLE });
    return s;
  }

  it("annonce un écran quand le premier se branche", () => {
    brancheRegie("regie");
    brancheEcran("tv1");
    expect(dernierCompte(h.emissions)).toBe(1);
  });

  it("annonce deux écrans quand un second se branche", () => {
    brancheRegie("regie");
    brancheEcran("tv1");
    brancheEcran("tv2");
    expect(dernierCompte(h.emissions)).toBe(2);
  });

  it("décrémente quand un écran se déconnecte", () => {
    brancheRegie("regie");
    brancheEcran("tv1");
    const tv2 = brancheEcran("tv2");
    tv2.deconnecte();
    expect(dernierCompte(h.emissions)).toBe(1);
  });

  it("retombe à zéro quand le dernier écran part", () => {
    brancheRegie("regie");
    const tv = brancheEcran("tv1");
    tv.deconnecte();
    expect(dernierCompte(h.emissions)).toBe(0);
  });

  it("donne le compte à la régie dès sa connexion", () => {
    brancheEcran("tv1");
    h.emissions.length = 0;
    brancheRegie("regie");
    expect(dernierCompte(h.emissions)).toBe(1);
  });

  it("ne ferme pas le salon quand un écran part alors que la régie reste", () => {
    brancheRegie("regie");
    const tv = brancheEcran("tv1");
    tv.deconnecte();
    // Le comportement de fermeture existant ne doit pas changer : la régie
    // encore connectée maintient le salon ouvert.
    expect(salonRooms[CODE]).toBeDefined();
    expect(salonRooms[CODE]._hostDcTimer).toBeNull();
  });

  it("une TV sans la bonne clé ne rejoint pas la salle du média", () => {
    for (const key of [undefined, "mauvaise-cle"]) {
      const s = makeSocket(`tv-${key}`, h.rooms);
      h.connecte(s);
      s.handlers.salon_join_host({ code: CODE, key });
      expect(s.propres).toEqual([]);
      expect(s.salonRole).toBeUndefined();
    }
  });
});

describe("joueur parti puis revenu, par les handlers", () => {
  let h;

  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    salonDeTest();
    salonRooms[CODE].game.phase = "summary";
    h = makeIo();
    registerSalon(h.io);
  });

  async function telephone(id, username, token) {
    const s = makeSocket(id, h.rooms);
    const recu = [];
    s.emit = (event, payload) => recu.push({ event, payload });
    h.connecte(s);
    await s.handlers.salon_join_player({ code: CODE, username, token });
    return { s, recu };
  }

  it("garde le score, réserve le pseudo et le rend au bon jeton", async () => {
    vi.useFakeTimers();
    try {
      const ana = await telephone("t1", "Ana");
      const token = ana.recu.find((e) => e.event === "salon_joined").payload
        .token;
      salonRooms[CODE].players.Ana.score = 200;

      ana.s.deconnecte();
      const salon = salonRooms[CODE];
      // Téléphone verrouillé 9 min : toujours dans la partie
      vi.advanceTimersByTime(9 * 60_000);
      expect(salon.players.Ana._disconnected).toBe(true);
      vi.advanceTimersByTime(61_000);
      expect(salon.players.Ana).toBeUndefined();
      expect(salon.departed[token]).toMatchObject({ score: 200, inGame: true });

      const intrus = await telephone("t2", "Ana", "autre");
      expect(intrus.recu.at(-1)).toMatchObject({
        event: "salon_error",
        payload: { message: "Ce pseudo est déjà pris." },
      });

      await telephone("t3", "Ana", token);
      expect(salon.players.Ana).toMatchObject({
        score: 200,
        scoreBeforeRound: 200,
      });
      expect(salon.departed).toEqual({});
    } finally {
      vi.useRealTimers();
    }
  });

  // Ana part avec 200 points de partie et 50 de soirée ; la régie est branchée
  async function anaPartie() {
    vi.useFakeTimers();
    const ana = await telephone("t1", "Ana");
    const salon = salonRooms[CODE];
    Object.assign(salon.players.Ana, { score: 200, night: 50 });
    ana.s.deconnecte();
    vi.advanceTimersByTime(10 * 60_000 + 1000);
    vi.useRealTimers();
    const regie = makeSocket("regie", h.rooms);
    h.connecte(regie);
    regie.handlers.salon_join_control({ code: CODE, key: CLE });
    return { salon, regie };
  }

  it("reste dans la liste en direct, marqué hors ligne", async () => {
    const { salon } = await anaPartie();
    await telephone("t2", "Bob");
    expect(getPlayerList(salon)).toEqual([
      expect.objectContaining({ username: "Bob", offline: false }),
      expect.objectContaining({
        username: "Ana",
        score: 200,
        offline: true,
        left: true,
        answeredThisRound: false,
      }),
    ]);
  });

  it("un jeton au nom d'une propriété d'objet est refusé", async () => {
    const { salon } = await anaPartie();
    for (const token of ["constructor", "__proto__", "toString"])
      await telephone(`t-${token}`, "Zoe", token);
    expect(salon.players.Zoe).toBeUndefined();
    expect(Object.keys(salon.departed)).toHaveLength(1);
  });

  it("l'hôte peut retirer un joueur parti", async () => {
    const { salon, regie } = await anaPartie();
    regie.handlers.salon_kick({ username: "Ana" });
    expect(salon.departed).toEqual({});
    expect(salon.banned.has("ana")).toBe(true);
  });

  it("la remise à zéro de la soirée vide aussi les partis", async () => {
    const { salon, regie } = await anaPartie();
    salon.pro = true;
    salon.nightGames = 1;
    regie.handlers.salon_reset_night({});
    expect(Object.values(salon.departed)[0].night).toBe(0);
    salon.nightGames = 1;
    expect(nightView(salon).players).toEqual([]);
  });
});

describe("reprise d'un salon après un redémarrage, par les handlers", () => {
  let h;
  let instantane;

  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    // Salon coupé en pleine manche 1, Ana à 120 points avant la manche
    salonDeTest();
    const salon = salonRooms[CODE];
    const titre = { id: "t1", title: "T", artist: "A" };
    Object.assign(salon.game, {
      phase: "round",
      currentRound: 1,
      fullPlaylist: [titre],
      played: [titre],
      currentTrack: titre,
    });
    salon.players.Ana = {
      username: "Ana",
      token: "jeton-ana",
      score: 180,
      scoreBeforeRound: 120,
      night: 0,
      team: null,
      stats: { found: 1, first: 0 },
      foundArtist: false,
      foundTitle: false,
      foundFeats: [],
      foundExtras: [],
    };
    instantane = serializeSalon(salon);
    delete salonRooms[CODE];
    db.reply = (fn) =>
      fn === "load_salon_snapshot"
        ? { data: [{ code: CODE, data: instantane }], error: null }
        : { data: null, error: null };
    h = makeIo();
    registerSalon(h.io);
  });

  function ecouteur(id) {
    const s = makeSocket(id, h.rooms);
    s.recu = [];
    s.emit = (event, payload) => s.recu.push({ event, payload });
    h.connecte(s);
    return s;
  }

  it("la TV retrouve son salon, en pause avant la manche coupée", async () => {
    const tv = ecouteur("tv");
    await tv.handlers.salon_join_host({ code: CODE, key: CLE });
    const joint = tv.recu.find((e) => e.event === "salon_host_joined");
    expect(joint.payload).toMatchObject({
      phase: "summary",
      paused: true,
      currentRound: 0,
    });
    expect(salonRooms[CODE].game.sessionPlaylist.map((t) => t.id)).toEqual([
      "t1",
    ]);
  });

  it("une mauvaise clé reste refusée sur un salon repris", async () => {
    const tv = ecouteur("tv");
    await tv.handlers.salon_join_host({ code: CODE, key: "pas-la-cle" });
    expect(tv.recu.at(-1)).toMatchObject({ event: "salon_error" });
    expect(tv.propres).toEqual([]);
  });

  it("le téléphone revient avec son jeton et retrouve son score", async () => {
    const tel = ecouteur("tel");
    await tel.handlers.salon_join_player({
      code: CODE,
      username: "Ana",
      token: "jeton-ana",
    });
    const joint = tel.recu.find((e) => e.event === "salon_joined");
    expect(joint.payload).toMatchObject({ reconnecting: true, score: 120 });
    expect(salonRooms[CODE].players.Ana._disconnected).toBe(false);
  });

  it("sans instantané ou base en panne : « introuvable », sans planter", async () => {
    for (const reply of [
      () => ({ data: [], error: null }),
      () => ({ data: null, error: { message: "panne" } }),
      () => {
        throw new Error("fetch failed");
      },
    ]) {
      db.reply = reply;
      const tv = ecouteur("tv");
      await tv.handlers.salon_join_host({ code: CODE, key: CLE });
      expect(tv.recu.at(-1)).toMatchObject({
        event: "salon_error",
        payload: { message: "Salon introuvable." },
      });
      expect(salonRooms[CODE]).toBeUndefined();
    }
  });
});
