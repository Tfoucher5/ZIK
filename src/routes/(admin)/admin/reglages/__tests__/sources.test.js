import { describe, it, expect, beforeEach, vi } from "vitest";

const m = vi.hoisted(() => ({ set: vi.fn(), log: vi.fn() }));

vi.mock("#lib/server/config.js", () => ({
  supabase: {},
  getAdminClient: () => ({}),
}));
vi.mock("#lib/server/services/music/sources.js", () => ({
  getSources: async () => ({ youtube: true, deezer: true }),
  setSources: m.set,
}));
vi.mock("#lib/server/middleware/auth.js", () => ({ logAdminAction: m.log }));

const { actions } = await import("../+page.server.js");

function envoi(champs) {
  const body = new FormData();
  for (const [k, v] of Object.entries(champs)) body.set(k, v);
  return actions.sources({
    request: new Request("http://x/admin/reglages", { method: "POST", body }),
    locals: { adminId: "admin-1" },
  });
}

describe("action des sources du son", () => {
  beforeEach(() => {
    m.set.mockReset().mockImplementation(async (v) => v);
    m.log.mockReset().mockResolvedValue();
  });

  it("deux cases cochées : tout allumé, noté au journal", async () => {
    expect(await envoi({ youtube: "on", deezer: "on" })).toEqual({
      sourcesSaved: true,
    });
    expect(m.set).toHaveBeenCalledWith({ youtube: true, deezer: true });
    expect(m.log).toHaveBeenCalledWith(
      "admin-1",
      "media_sources",
      null,
      "site",
      { youtube: true, deezer: true },
    );
  });

  it("case décochée (absente du formulaire) : source coupée", async () => {
    await envoi({ deezer: "on" });
    expect(m.set).toHaveBeenCalledWith({ youtube: false, deezer: true });
  });

  it("base en échec : erreur 500 lisible, rien au journal", async () => {
    m.set.mockRejectedValue(new Error("panne"));
    const res = await envoi({ youtube: "on", deezer: "on" });
    expect(res.status).toBe(500);
    expect(res.data).toEqual({
      sourcesError: "Enregistrement impossible, réessaie.",
    });
    expect(m.log).not.toHaveBeenCalled();
  });
});
