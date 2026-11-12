import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const db = vi.hoisted(() => ({ updates: [] }));

vi.mock("../snapshot.js", () => ({
  saveSnapshot: async () => {},
  freezeAndSaveAll: async () => {},
  purgeSnapshots: async () => {},
  dropSnapshot: async () => {},
  restoreSalon: async () => {},
}));
vi.mock("../../../config.js", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null }) }),
        in: async () => ({ data: [] }),
      }),
    }),
    rpc: async () => ({ data: null, error: null }),
  },
  getAdminClient: () => ({
    rpc: async () => ({ error: null }),
    schema: () => ({
      from: (table) => ({
        insert: () => ({ then: (r) => r({ error: null }) }),
        update: (row) => ({
          eq: (col, id) => {
            db.updates.push({ table, row, id });
            return { then: (r) => r({ error: null }) };
          },
        }),
      }),
    }),
    from: () => ({ insert: () => ({ then: (r) => r({ error: null }) }) }),
  }),
}));
vi.mock("../../game/audio.js", () => ({ validPreviewUrl: () => null }));
vi.mock("../../../services/music/deezer.js", () => ({
  fetchDeezerTrackPreview: async () => null,
  deezerPreviewMatch: async () => null,
}));

const { salonRooms } = await import("../../../state.js");
const { registerSalon } = await import("../index.js");
const { CODE, CLE, makeIo, makeSocket, salonDeTest } =
  await import("./salonHarness.js");

const fermetures = (h) => h.emissions.filter((e) => e.event === "salon_closed");

describe("« Fermer la soirée »", () => {
  let h, regie;

  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    db.updates.length = 0;
    salonDeTest();
    h = makeIo();
    registerSalon(h.io);
    regie = makeSocket("regie", h.rooms);
    h.connecte(regie);
    regie.handlers.salon_join_control({ code: CODE, key: CLE });
  });
  afterEach(() => vi.useRealTimers());

  it("ferme le salon tout de suite et prévient tout le monde", () => {
    regie.handlers.salon_close();
    expect(salonRooms[CODE]).toBeUndefined();
    expect(fermetures(h)).toEqual([
      {
        cibles: [`salon:${CODE}`],
        event: "salon_closed",
        payload: { message: "L'hôte a fermé la soirée." },
      },
    ]);
  });

  it("enregistre la fin de la partie en cours", () => {
    salonRooms[CODE].game.phase = "round";
    salonRooms[CODE].game.dbGameId = "g42";
    regie.handlers.salon_close();
    expect(db.updates).toMatchObject([
      { table: "games", id: "g42", row: { player_count: 0 } },
    ]);
  });

  it("un téléphone ne peut pas fermer la soirée", async () => {
    const tel = makeSocket("tel", h.rooms);
    h.connecte(tel);
    await tel.handlers.salon_join_player({ code: CODE, username: "Ana" });
    tel.handlers.salon_close();
    expect(salonRooms[CODE]).toBeDefined();
    expect(fermetures(h)).toEqual([]);
  });

  it("ignore les charges hostiles sans faire tomber le serveur", () => {
    const intrus = makeSocket("intrus", h.rooms);
    h.connecte(intrus);
    for (const p of [undefined, null, "x", 42, { code: CODE, key: CLE }])
      expect(() => intrus.handlers.salon_close(p)).not.toThrow();
    expect(salonRooms[CODE]).toBeDefined();
    for (const p of [null, "x", 42, [1], { __proto__: { a: 1 } }])
      expect(() => regie.handlers.salon_close(p)).not.toThrow();
  });

  it("une simple déconnexion de l'hôte garde le salon le temps du délai", () => {
    vi.useFakeTimers();
    regie.deconnecte();
    vi.advanceTimersByTime(60 * 60_000);
    expect(salonRooms[CODE]).toBeDefined();
    vi.advanceTimersByTime(61 * 60_000);
    expect(salonRooms[CODE]).toBeUndefined();
    expect(fermetures(h)[0].payload.message).toBe("L'hôte a quitté le salon.");
  });
});
