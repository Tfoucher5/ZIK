import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const m = vi.hoisted(() => ({ insert: vi.fn(), alert: vi.fn() }));

vi.mock("../../config.js", () => ({
  supabase: {},
  getAdminClient: () => ({ from: () => ({ insert: m.insert }) }),
}));
vi.mock("../../services/admin/alerts.js", () => ({ alertAdminsSafe: m.alert }));

const { logAdminAction } = await import("../auth.js");

describe("logAdminAction", () => {
  beforeEach(() => {
    m.insert.mockReset();
    m.alert.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("écriture réussie : pas d'alerte", async () => {
    m.insert.mockResolvedValue({ error: null });
    await logAdminAction("a1", "edit_room", null, "room");
    expect(m.alert).not.toHaveBeenCalled();
  });

  it("écriture en échec : ne lève pas, alerte limitée dans le temps", async () => {
    m.insert.mockResolvedValue({ error: { message: "panne" } });
    await logAdminAction("a1", "edit_room", null, "room");
    expect(m.alert).toHaveBeenCalledOnce();
    const [kind, payload, opts] = m.alert.mock.calls[0];
    expect(kind).toBe("admin_errors");
    expect(payload.body).toContain("edit_room");
    expect(opts.throttleMs).toBeGreaterThan(0);
  });
});
