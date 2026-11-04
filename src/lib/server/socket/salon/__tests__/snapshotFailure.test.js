import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => ({
    rpc: async () => ({ error: { message: "base injoignable" } }),
  }),
}));

const { salonRooms } = await import("../../../state.js");
const { saveSnapshot, dropSnapshot } = await import("../snapshot.js");
const { countSince, resetOpsEvents } =
  await import("../../../services/health/opsEvents.js");
const { CODE, salonDeTest } = await import("./salonHarness.js");

describe("sauvegarde d'un salon en échec", () => {
  beforeEach(() => {
    resetOpsEvents();
    vi.spyOn(console, "error").mockImplementation(() => {});
    salonDeTest();
  });

  it("une sauvegarde ratée est notée pour la sonde, sans lever", async () => {
    await expect(saveSnapshot(salonRooms[CODE])).resolves.toBeNull();
    expect(countSince("snapshot_failed", 60_000)).toBe(1);
  });

  it("les autres écritures ne comptent pas comme une sauvegarde", async () => {
    await dropSnapshot(CODE);
    expect(countSince("snapshot_failed", 60_000)).toBe(0);
  });
});
