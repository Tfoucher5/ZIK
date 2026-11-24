import { describe, it, expect, beforeEach, vi } from "vitest";

const m = vi.hoisted(() => ({ fill: vi.fn(), left: vi.fn(), log: vi.fn() }));

vi.mock("#lib/server/config.js", () => ({
  supabase: {},
  getAdminClient: () => ({}),
}));
vi.mock("#lib/server/services/music/deezerIds.js", () => ({
  fillDeezerIds: m.fill,
  remaining: m.left,
}));
vi.mock("#lib/server/middleware/auth.js", () => ({ logAdminAction: m.log }));

const { actions } = await import("../+page.server.js");
const envoi = () =>
  actions.deezerIds({
    request: new Request("http://x/admin/reglages", { method: "POST" }),
    locals: { adminId: "admin-1" },
  });

describe("action « Compléter les identifiants Deezer »", () => {
  beforeEach(() => {
    m.fill.mockReset();
    m.log.mockReset().mockResolvedValue();
  });

  it("un lot traité : résultat rendu et noté au journal", async () => {
    const lot = { checked: 200, found: 150, failed: 0, left: 1300 };
    m.fill.mockResolvedValue(lot);
    expect(await envoi()).toEqual({ deezerIds: lot });
    expect(m.log).toHaveBeenCalledWith(
      "admin-1",
      "deezer_ids",
      null,
      "site",
      lot,
    );
  });

  it("base en échec : erreur 500 lisible, rien au journal", async () => {
    m.fill.mockRejectedValue(new Error("panne"));
    const res = await envoi();
    expect(res.status).toBe(500);
    expect(res.data).toEqual({ deezerIdsError: "Lot interrompu, réessaie." });
    expect(m.log).not.toHaveBeenCalled();
  });
});
