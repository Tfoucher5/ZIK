import { describe, it, expect, beforeEach, vi } from "vitest";

// Fausse base : un seul salon a un instantané
const db = vi.hoisted(() => ({ lectures: 0, instantane: null }));
vi.mock("$lib/server/config.js", () => ({
  supabase: {},
  getAdminClient: () => ({
    rpc: async (fn, a) => {
      if (fn !== "load_salon_snapshot") return { data: null, error: null };
      db.lectures++;
      return a.p_code === "REPRIS" && db.instantane
        ? { data: [{ code: "REPRIS", data: structuredClone(db.instantane) }] }
        : { data: [], error: null };
    },
  }),
}));

const { salonRooms } = await import("$lib/server/state.js");
const { serializeSalon } = await import("$lib/server/socket/salon/snapshot.js");
const { GET } = await import("../+server.js");

const demande = async (code) => {
  const res = await GET({ url: new URL(`http://x/api/salon?code=${code}`) });
  return res.status;
};

describe("GET /api/salon : la soirée est-elle encore ouverte ?", () => {
  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    const titre = { id: "t", title: "T", artist: "A" };
    db.instantane = serializeSalon({
      code: "REPRIS",
      settings: { answerMode: "free" },
      players: {},
      banned: new Set(),
      game: {
        phase: "lobby",
        currentRound: 0,
        fullPlaylist: [titre],
        sessionPlaylist: [titre],
        played: [],
        history: [],
      },
    });
  });

  it("entrées hostiles : refusées sans planter", async () => {
    for (const code of ["__proto__", "", "AB", "A".repeat(40), "ab$12"])
      expect(await demande(encodeURIComponent(code)), code).toBe(400);
    expect(db.lectures).toBe(0);
    // Mis en majuscules, un nom de propriété d'objet n'est qu'un code inconnu
    expect(await demande("constructor")).toBe(404);
  });

  it("salon présent seulement dans son instantané (juste après un redémarrage) : ouvert", async () => {
    expect(await demande("REPRIS")).toBe(200);
    expect(salonRooms.REPRIS).toBeDefined();
  });

  it("salon fermé : 404", async () => {
    expect(await demande("FERME1")).toBe(404);
  });

  it("trop de recherches ratées : « réessayez », jamais un faux « fermé »", async () => {
    for (let i = 0; i < 8; i++) await demande(`HASARD${i}`);
    expect(await demande("REPRIS")).toBe(503);
  });
});
