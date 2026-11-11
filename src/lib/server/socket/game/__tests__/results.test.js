import { describe, it, expect, vi } from "vitest";

const anonRpc = vi.fn(async () => ({ data: null, error: null }));
const adminRpc = vi.fn(async () => ({ data: null, error: null }));

vi.mock("../../../config.js", () => {
  const query = {
    insert: async () => ({ error: null }),
    select: () => query,
    eq: () => query,
    lte: () => query,
    single: async () => ({ data: null }),
    then: (r) => r({ data: [], error: null }),
  };
  return {
    supabase: {
      schema() {
        return this;
      },
      from: () => query,
      rpc: anonRpc,
    },
    getAdminClient: () => ({
      schema() {
        return this;
      },
      from: () => query,
      rpc: adminRpc,
    }),
  };
});

const { saveMidGamePlayer } = await import("../results.js");
const { checkAchievements } = await import("../../../services/achievements.js");

// Révoquées pour anon et authenticated : appelées avec la clé publique, elles
// échoueraient en silence et les scores ne seraient plus comptés.
describe("RPC de scores via le client admin", () => {
  it("update_player_stats", async () => {
    const player = { name: "Ana", userId: "u1", isGuest: false, score: 42 };
    await saveMidGamePlayer("game-1", player, "classic", 3);
    expect(adminRpc).toHaveBeenCalledWith(
      "update_player_stats",
      expect.objectContaining({ p_user_id: "u1", p_score: 42 }),
    );
    expect(anonRpc).not.toHaveBeenCalled();
  });

  it("update_player_streaks", async () => {
    await checkAchievements("u1", { score: 10, rank: 1, totalPlayers: 2 });
    expect(adminRpc).toHaveBeenCalledWith("update_player_streaks", {
      p_user_id: "u1",
      p_won: true,
    });
    expect(anonRpc).not.toHaveBeenCalled();
  });
});
