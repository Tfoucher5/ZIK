import { describe, it, expect, beforeEach, vi } from "vitest";

const m = vi.hoisted(() => ({
  publish: vi.fn(),
  log: vi.fn(),
}));

vi.mock("$lib/server/config.js", () => ({
  supabase: {},
  getAdminClient: () => ({}),
}));
vi.mock("$lib/server/services/admin/salonNotice.js", () => ({
  publishSalonNotice: m.publish,
}));
vi.mock("$lib/server/middleware/auth.js", () => ({ logAdminAction: m.log }));

const { actions } = await import("../+page.server.js");

function envoi(champs) {
  const body = new FormData();
  for (const [k, v] of Object.entries(champs)) body.set(k, v);
  return actions.notice({
    request: new Request("http://x/admin/reglages", { method: "POST", body }),
    locals: { adminId: "admin-1" },
  });
}

describe("action d'annonce aux salons", () => {
  beforeEach(() => {
    m.publish.mockReset().mockImplementation(async (t) => t);
    m.log.mockReset().mockResolvedValue();
  });

  it("publie le message et le note au journal", async () => {
    expect(await envoi({ message: "Mise à jour à 23 h" })).toEqual({
      noticeSaved: true,
    });
    expect(m.publish).toHaveBeenCalledWith("Mise à jour à 23 h");
    expect(m.log).toHaveBeenCalledWith(
      "admin-1",
      "salon_notice_on",
      null,
      "site",
      { message: "Mise à jour à 23 h" },
    );
  });

  it("le bouton Retirer l'emporte sur le texte encore dans le champ", async () => {
    await envoi({ message: "ancien texte", clear: "1" });
    expect(m.publish).toHaveBeenCalledWith("");
    expect(m.log.mock.calls[0][1]).toBe("salon_notice_off");
  });

  it("base en échec : erreur 500 lisible, rien au journal", async () => {
    m.publish.mockRejectedValue(new Error("panne"));
    const res = await envoi({ message: "x" });
    expect(res.status).toBe(500);
    expect(res.data).toEqual({ noticeError: "Publication impossible." });
    expect(m.log).not.toHaveBeenCalled();
  });
});
