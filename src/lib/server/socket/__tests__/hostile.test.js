import { describe, it, expect, vi, afterAll } from "vitest";

// Pas de base en test : les instantanés sont couverts par snapshot.test.js
vi.mock("../salon/snapshot.js", () => ({
  saveSnapshot: async () => {},
  freezeAndSaveAll: async () => {},
  purgeSnapshots: async () => {},
  dropSnapshot: async () => {},
  restoreSalon: async () => {},
}));

// Client Supabase factice : toute chaîne d'appels finit en { data: null }
vi.mock("../../config.js", () => {
  const db = new Proxy(function () {}, {
    get: (_, prop) =>
      prop === "then" ? (resolve) => resolve({ data: null, error: null }) : db,
    apply: () => db,
  });
  return { supabase: db, getAdminClient: () => db };
});

// Garde le schéma de chaque événement pour vérifier les vrais payloads clients
const schemas = {};
vi.mock("../safe.js", async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    safe: (socket, name, schema, fn) => {
      schemas[name] = schema;
      return real.safe(socket, name, schema, fn);
    },
  };
});

const { safe, validate, str, key, int, optional } = await import("../safe.js");
const { dbRooms, salonRooms } = await import("../../state.js");
const { register } = await import("../game/index.js");
const { registerSalon } = await import("../salon/index.js");
const { registerPresence } = await import("../presence.js");

const HOSTILE = [
  undefined,
  null,
  42,
  true,
  "texte",
  [],
  ["a"],
  {},
  { guess: 42 },
  { code: "constructor", username: "__proto__", key: "x" },
  { roomId: "ABC123", username: " __proto__" },
  { code: "ABC123", username: " constructor " },
  { guess: "x".repeat(1_000_000) },
  { choiceIndex: -1, team: "0", volume: "50", username: {} },
];

function connect() {
  const handlers = {};
  let onConnection = [];
  const io = {
    on: (evt, fn) => evt === "connection" && onConnection.push(fn),
    to: () => ({ emit: () => {} }),
    emit: () => {},
    sockets: { sockets: new Map(), adapter: { rooms: new Map() } },
  };
  register(io);
  registerSalon(io);
  registerPresence(io);
  const socket = {
    id: "sock-hostile",
    data: {},
    handshake: { headers: {}, address: "127.0.0.1" },
    on: (evt, fn) => (handlers[evt] ??= []).push(fn),
    emit: () => {},
    join: () => {},
    leave: () => {},
    disconnect: () => {},
  };
  onConnection.forEach((fn) => fn(socket));
  return handlers;
}

describe("validate", () => {
  it("refuse un payload qui n'est pas un objet ou un champ invalide", () => {
    const schema = { guess: str(10) };
    expect(validate(schema, undefined)).toBeNull();
    expect(validate(schema, ["x"])).toBeNull();
    expect(validate(schema, { guess: 42 })).toBeNull();
    expect(validate(schema, { guess: "x".repeat(11) })).toBeNull();
    expect(validate(schema, { guess: "ok", extra: 1 })).toEqual({
      guess: "ok",
    });
  });

  it("schéma vide : payload ignoré ; schéma fonction : valeur simple", () => {
    expect(validate({}, "transport close")).toEqual({});
    expect(validate(str(5), "abc")).toBe("abc");
    expect(validate(str(5), { a: 1 })).toBeNull();
  });

  it("key refuse les clés d'Object.prototype", () => {
    expect(key(20)("constructor")).toBeUndefined();
    expect(key(20)("__proto__")).toBeUndefined();
    expect(key(20)("Julie")).toBe("Julie");
  });

  it("optional accepte null et undefined, int borne", () => {
    expect(optional(int(0, 9))(null)).toBeNull();
    expect(optional(int(0, 9))(undefined)).toBeNull();
    expect(int(0, 9)(10)).toBeUndefined();
    expect(int(0, 9)(1.5)).toBeUndefined();
  });

  it("safe attrape l'exception du handler", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    let handler;
    safe({ on: (_, fn) => (handler = fn) }, "boom", {}, () => {
      throw new Error("boom");
    });
    await expect(handler()).resolves.toBeUndefined();
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });
});

describe("entrées hostiles sur tous les handlers", () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  afterAll(() => errors.mockRestore());
  const handlers = connect();
  // Room connue : « __proto__ » atteint le code qui suit la lecture en base
  dbRooms.ABC123 = { code: "ABC123", auto_start: false, is_public: true };

  it("aucun payload ne pollue Object.prototype", async () => {
    // Salon ouvert : « __proto__ » atteint la branche « joueur déjà là »
    salonRooms.ABC123 = {
      code: "ABC123",
      adminKey: "k",
      settings: { maxRounds: 10, roundDuration: 30, playlistIds: [] },
      players: {},
      banned: new Set(),
      game: { phase: "lobby", sessionPlaylist: [], history: [], played: [] },
    };
    for (const fn of handlers.join_room)
      for (const payload of HOSTILE) await fn(payload, () => {});
    for (const fn of handlers.salon_join_player)
      for (const payload of HOSTILE) await fn(payload, () => {});
    for (const fn of handlers.submit_guess) await fn("x", () => {});
    delete salonRooms.ABC123;
    for (const k of ["ipHash", "score", "socketId", "_disconnected"])
      expect({}[k], k).toBeUndefined();
  });

  it("40 handlers enregistrés", () => {
    const count = Object.values(handlers).reduce((n, l) => n + l.length, 0);
    expect(count).toBe(40);
  });

  // Formes exactes envoyées par la TV, la régie, les téléphones et le jeu en ligne
  const LEGIT = {
    join_room: [
      {
        roomId: "ABC123",
        username: "Julie",
        userId: null,
        isGuest: true,
        token: null,
      },
      {
        roomId: "ABC123",
        username: "Tesko",
        userId: "57e02ae0-fbe8-4b3a-9834-ed72e17a0607",
        isGuest: false,
        token: "jwt",
        takeover: true,
      },
    ],
    request_new_game: [undefined],
    disconnect: ["transport close"],
    submit_guess: ["daft punk"],
    submit_choice: [{ choiceIndex: 3 }],
    send_chat: ["salut"],
    player_ready: [undefined],
    "presence:hello": ["jwt"],
    salon_join_host: [
      { code: "ABC123", key: "k" },
      { code: "ABC123", key: null },
    ],
    salon_join_control: [{ code: "ABC123", key: "k" }],
    salon_join_player: [
      { code: "ABC123", username: "Julie", token: "t", auth: undefined },
      { code: "ABC123", username: "Julie", token: null, auth: "jwt" },
    ],
    salon_pick_team: [{ team: 0 }],
    salon_submit_guess: [{ guess: "daft punk" }],
    salon_submit_choice: [{ choiceIndex: 0 }],
    salon_buzz: [undefined],
    salon_buzz_judge: [{ correct: true }, { correct: false }],
    salon_volume: [{ volume: 55 }],
    salon_kick: [{ username: "Julie" }],
    salon_adjust_score: [
      { username: "Julie", delta: -100 },
      { username: "Julie", score: 1200 },
    ],
    salon_update_settings: [{ finaleSound: false }, { maxRounds: 15 }],
    salon_rename_team: [{ team: 1, name: "Les Rouges" }],
    salon_set_player_team: [{ username: "Julie", team: 2 }],
    salon_video_failed: [{ videoId: "dQw4w9WgXcQ" }],
    salon_report_video: [{ reason: "mal calée" }],
    salon_intermission: [{ minutes: 0 }, { minutes: 15 }, { minutes: null }],
    salon_support_call: [{ message: "" }, { message: "La musique coupe" }],
    salon_support_send: [{ text: "Merci" }],
  };

  for (const evt of [
    "salon_pause",
    "salon_resume",
    "salon_reveal",
    "salon_end_game",
    "salon_start",
    "salon_music_ready",
    "salon_next_round",
    "salon_restart",
    "salon_reset_night",
    "salon_finale",
    "salon_evening_close",
  ])
    LEGIT[evt] = [undefined];

  it("accepte les payloads des vrais clients, pour chaque événement", () => {
    expect(Object.keys(LEGIT).sort()).toEqual(
      Object.keys(schemas)
        .filter((evt) => evt !== "boom")
        .sort(),
    );
    for (const [evt, payloads] of Object.entries(LEGIT))
      for (const p of payloads)
        expect(
          validate(schemas[evt], p),
          `${evt} ${JSON.stringify(p)}`,
        ).not.toBeNull();
  });

  for (const [evt, list] of Object.entries(handlers)) {
    it(`${evt} ignore les payloads hostiles sans lever`, async () => {
      for (const fn of list)
        for (const payload of HOSTILE)
          await expect(fn(payload, () => {})).resolves.toBeUndefined();
      expect(errors).not.toHaveBeenCalled();
    });
  }
});
