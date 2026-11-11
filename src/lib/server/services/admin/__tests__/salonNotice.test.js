import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const db = vi.hoisted(() => ({
  row: null,
  readError: null,
  writeError: null,
  writes: [],
}));

vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => ({
    schema: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: db.row, error: db.readError }),
          }),
        }),
        upsert: async (row) => {
          db.writes.push(row);
          return { error: db.writeError };
        },
      }),
    }),
  }),
}));

const { salonRooms, setIO, getSalonNotice, setSalonNotice } =
  await import("../../../state.js");
const { loadSalonNotice, publishSalonNotice, NOTICE_MAX } =
  await import("../salonNotice.js");

describe("annonce de l'admin aux salons", () => {
  let emissions;

  beforeEach(() => {
    emissions = [];
    Object.assign(db, {
      row: null,
      readError: null,
      writeError: null,
      writes: [],
    });
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    salonRooms.AAA = {};
    salonRooms.BBB = {};
    setSalonNotice("");
    setIO({
      to: (room) => ({
        emit: (event, payload) => emissions.push({ room, event, payload }),
      }),
    });
  });

  afterEach(() => {
    setIO(null);
    vi.useRealTimers();
  });

  it("part vers tous les écrans de chaque salon, avec le message et rien d'autre", async () => {
    await publishSalonNotice("  Mise à jour à 23 h  ");
    expect(getSalonNotice()).toBe("Mise à jour à 23 h");
    expect(emissions).toEqual(
      ["salon:AAA", "salon:BBB"].map((room) => ({
        room,
        event: "salon_notice",
        payload: { message: "Mise à jour à 23 h" },
      })),
    );
    expect(db.writes[0].key).toBe("salon_notice");
    expect(db.writes[0].value).toEqual({ message: "Mise à jour à 23 h" });
  });

  it("un message vide retire l'annonce partout", async () => {
    setSalonNotice("ancienne");
    await publishSalonNotice("");
    expect(getSalonNotice()).toBe("");
    expect(emissions.map((e) => e.payload.message)).toEqual(["", ""]);
  });

  it.each([
    [null, ""],
    [undefined, ""],
    ["x".repeat(NOTICE_MAX + 50), "x".repeat(NOTICE_MAX)],
  ])("borne un message anormal (%#)", async (entree, attendu) => {
    expect(await publishSalonNotice(entree)).toBe(attendu);
  });

  it("base en échec : rien n'est diffusé, l'admin voit l'erreur", async () => {
    setSalonNotice("ancienne");
    db.writeError = { message: "panne" };
    await expect(publishSalonNotice("nouvelle")).rejects.toThrow("panne");
    expect(getSalonNotice()).toBe("ancienne");
    expect(emissions).toEqual([]);
  });

  it("publier sans serveur Socket.io démarré ne plante pas", async () => {
    setIO(null);
    await publishSalonNotice("bonjour");
    expect(getSalonNotice()).toBe("bonjour");
  });

  it("au démarrage, relit l'annonce et prévient les salons déjà revenus", async () => {
    db.row = { value: { message: "toujours là" } };
    await loadSalonNotice();
    expect(getSalonNotice()).toBe("toujours là");
    expect(emissions).toHaveLength(2);
  });

  it("au démarrage sans annonce en base : aucun bandeau", async () => {
    await loadSalonNotice();
    expect(getSalonNotice()).toBe("");
  });

  it("lecture en échec au démarrage : pas de plantage, nouvel essai plus tard", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    db.readError = { message: "panne" };
    await loadSalonNotice();
    expect(getSalonNotice()).toBe("");

    db.readError = null;
    db.row = { value: { message: "revenue" } };
    await vi.advanceTimersByTimeAsync(60 * 1000);
    expect(getSalonNotice()).toBe("revenue");
  });
});
