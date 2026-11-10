import { describe, it, expect, vi, beforeAll } from "vitest";

// Clé service absente ou client admin en panne : succès, séries et défi ne
// doivent jamais se rabattre sur la clé anonyme, et le jeu continue.
const anon = vi.hoisted(() => {
  const tables = [];
  const chaine = new Proxy(
    {},
    {
      get: (_, p) =>
        p === "then" ? (ok) => ok({ data: null, error: null }) : () => chaine,
    },
  );
  return {
    tables,
    client: {
      from: (t) => (tables.push(t), chaine),
      rpc: vi.fn(async () => ({ data: null, error: null })),
    },
  };
});
vi.mock("../../config.js", () => ({
  supabase: anon.client,
  getAdminClient: () => {
    throw new Error("SUPABASE_SERVICE_KEY manquante");
  },
}));

let a;
let w;
beforeAll(async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  a = await import("../achievements.js");
  w = await import("../weeklyChallenge.js");
});

describe("client admin indisponible", () => {
  it("succès et résultats : rien d'écrit, échec silencieux", async () => {
    expect(await a.checkAchievements("u1", { won: true, score: 10 })).toEqual(
      [],
    );
    expect(
      await a.saveGameResult({ gameId: "g", username: "a", score: 1 }),
    ).toBeNull();
  });

  it("défi de la semaine : rien d'écrit, échec silencieux", async () => {
    expect(await w.getOrCreateWeeklyChallenge()).toBeNull();
    expect(() => w.bumpWeeklyChallenge("games_played", "u1")).not.toThrow();
  });

  it("aucune écriture ni RPC par la clé anonyme", () => {
    expect(anon.client.rpc).not.toHaveBeenCalled();
    // seule lecture permise : la liste publique des succès
    expect(anon.tables.every((t) => t === "achievements")).toBe(true);
  });
});
