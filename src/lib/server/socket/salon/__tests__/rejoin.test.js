import { describe, it, expect, beforeEach, vi } from "vitest";

// Base simulée : chaque test choisit ce que renvoient les fonctions SQL
const db = vi.hoisted(() => ({ reply: () => ({ data: null, error: null }) }));

// Retour d'un écran ou d'un téléphone : reprise depuis l'instantané et chrono
// donné à la reconnexion. Supabase et YouTube sont neutralisés.
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
const { serializeSalon } = await import("../snapshot.js");
const { CODE, CLE, makeIo, makeSocket, salonDeTest } =
  await import("./salonHarness.js");

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
        ? {
            data: [{ code: CODE, data: structuredClone(instantane) }],
            error: null,
          }
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

  it("la TV retrouve son salon, tout le monde est prévenu, la manche coupée repart seule", async () => {
    const tv = ecouteur("tv");
    await tv.handlers.salon_join_host({ code: CODE, key: CLE });
    const joint = tv.recu.find((e) => e.event === "salon_host_joined");
    expect(joint.payload).toMatchObject({
      phase: "summary",
      paused: false,
      currentRound: 0,
    });
    const game = salonRooms[CODE].game;
    expect(game.sessionPlaylist.map((t) => t.id)).toEqual(["t1"]);
    const annonce = h.emissions.find((e) => e.event === "salon_restored");
    expect(annonce).toMatchObject({
      cibles: [`salon:${CODE}`],
      payload: { resumeIn: 5 },
    });
    expect(game.breakTimer).not.toBeNull();
    expect(game.restored).toBeUndefined();
    clearTimeout(game.breakTimer);

    // Une TV qui se recharge ensuite ne relance rien
    h.emissions.length = 0;
    await ecouteur("tv2").handlers.salon_join_host({ code: CODE, key: CLE });
    expect(h.emissions.some((e) => e.event === "salon_restored")).toBe(false);
  });

  it("la régie a déjà mis en pause ou relancé avant le retour de la TV : rien ne repart seul", async () => {
    // Pause posée par la régie, revenue la première
    const rg = ecouteur("rg");
    await rg.handlers.salon_join_control({ code: CODE, key: CLE });
    rg.handlers.salon_pause({});
    await ecouteur("tv").handlers.salon_join_host({ code: CODE, key: CLE });
    expect(h.emissions.some((e) => e.event === "salon_restored")).toBe(false);
    expect(salonRooms[CODE].game).toMatchObject({ paused: true });
    expect(salonRooms[CODE].game.breakTimer ?? null).toBeNull();

    // Manche déjà relancée par la régie
    delete salonRooms[CODE];
    const rg2 = ecouteur("rg2");
    await rg2.handlers.salon_join_control({ code: CODE, key: CLE });
    salonRooms[CODE].game.phase = "round";
    await ecouteur("tv2").handlers.salon_join_host({ code: CODE, key: CLE });
    expect(h.emissions.some((e) => e.event === "salon_restored")).toBe(false);
    expect(salonRooms[CODE].game.breakTimer ?? null).toBeNull();
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

describe("chrono donné à la reconnexion", () => {
  let h;

  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    db.reply = () => ({ data: null, error: null });
    salonDeTest();
    Object.assign(salonRooms[CODE].game, {
      phase: "round",
      currentRound: 1,
      currentTrack: { id: "t1", title: "T", artist: "A" },
      timerActive: true,
      timerMax: 30,
      timerValue: 20,
      endsAt: Date.now() + 20_000,
    });
    salonRooms[CODE].players.Ana = {
      username: "Ana",
      token: "jeton-ana",
      score: 0,
      team: null,
      stats: { found: 0, first: 0 },
      foundFeats: [],
      foundExtras: [],
    };
    h = makeIo();
    registerSalon(h.io);
  });

  async function arrivees() {
    const recu = {};
    for (const [id, evt, payload, attendu] of [
      ["tv", "salon_join_host", { code: CODE, key: CLE }, "salon_host_joined"],
      [
        "rg",
        "salon_join_control",
        { code: CODE, key: CLE },
        "salon_control_joined",
      ],
      [
        "tel",
        "salon_join_player",
        { code: CODE, username: "Ana", token: "jeton-ana" },
        "salon_joined",
      ],
    ]) {
      const s = makeSocket(id, h.rooms);
      const msgs = [];
      s.emit = (event, p) => msgs.push({ event, p });
      h.connecte(s);
      await s.handlers[evt](payload);
      recu[id] = msgs.find((m) => m.event === attendu).p;
    }
    return recu;
  }

  it("en pleine manche, TV, régie et téléphone reçoivent l'heure de fin", async () => {
    const recu = await arrivees();
    const fin = salonRooms[CODE].game.endsAt;
    for (const id of ["tv", "rg", "tel"]) {
      expect(recu[id].endsAt, id).toBe(fin);
      expect(typeof recu[id].now, id).toBe("number");
    }
  });

  it("en pause, aucune heure de fin : les écrans restent figés", async () => {
    salonRooms[CODE].game.paused = true;
    const recu = await arrivees();
    for (const id of ["tv", "rg", "tel"])
      expect(recu[id].endsAt, id).toBeNull();
  });
});
