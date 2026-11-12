import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FREE_MAX_PLAYERS } from "../../../../data/proPlans.js";

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
  validPreviewUrl: () => null,
}));
vi.mock("../../../services/music/deezer.js", () => ({
  fetchDeezerTrackPreview: async () => null,
  deezerPreviewMatch: async () => null,
}));
const { salonRooms } = await import("../../../state.js");
const { registerSalon } = await import("../index.js");
const { getPlayerList, nightView } = await import("../players.js");
const { CODE, CLE, makeIo, makeSocket, salonDeTest } =
  await import("./salonHarness.js");

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

describe("journal du salon pour l'admin", () => {
  let h;
  const journal = () => (salonRooms[CODE]._journal ?? []).map((e) => e.text);

  beforeEach(() => {
    vi.useFakeTimers();
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    salonDeTest();
    h = makeIo();
    registerSalon(h.io);
  });

  afterEach(() => {
    clearTimeout(salonRooms[CODE]?._hostDcTimer);
    vi.useRealTimers();
  });

  function rejoint(id, event) {
    const s = makeSocket(id, h.rooms);
    h.connecte(s);
    s.handlers[event]({ code: CODE, key: CLE });
    return s;
  }

  it("note la coupure de l'hôte puis son retour, rien sans coupure", () => {
    const tv = rejoint("tv1", "salon_join_host");
    const regie = rejoint("regie", "salon_join_control");
    expect(journal()).toEqual([]);
    tv.deconnecte();
    expect(journal()).toEqual([]);
    regie.deconnecte();
    expect(journal()).toEqual(["Hôte déconnecté : plus de TV ni de régie"]);
    rejoint("tv2", "salon_join_host");
    expect(journal()[0]).toBe("Hôte revenu (TV)");
  });

  it("note un joueur refusé par la limite gratuite", async () => {
    const salon = salonRooms[CODE];
    for (let i = 0; i < FREE_MAX_PLAYERS; i++)
      salon.players[`J${i}`] = { username: `J${i}`, score: 0 };
    const tel = makeSocket("tel", h.rooms);
    h.connecte(tel);
    await tel.handlers.salon_join_player({ code: CODE, username: "Zoé" });
    expect(journal()).toEqual(["Zoé refusé : limite gratuite atteinte"]);
  });
});
