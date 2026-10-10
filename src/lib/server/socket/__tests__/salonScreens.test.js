import { describe, it, expect, beforeEach, vi } from "vitest";

// salon.js parle à Supabase et à YouTube dès l'import : on les neutralise,
// ces tests ne portent que sur la diffusion du nombre d'écrans connectés.
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
});
