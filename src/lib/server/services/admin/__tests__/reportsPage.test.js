import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ rooms: {} }));
vi.mock("$lib/server/config.js", async () => {
  const { fakeClients } = await import("../../__tests__/fakeQuery.js");
  return fakeClients(h);
});
vi.mock("$lib/server/middleware/auth.js", () => ({
  logAdminAction: vi.fn(),
}));
vi.mock("$lib/server/state.js", () => ({ salonRooms: h.rooms }));

const page =
  await import("../../../../../routes/(admin)/admin/reports/+page.server.js");

const load = () => page.load({ locals: { adminId: "admin" } });
const reporter = { id: "r1", username: "lea", avatar_url: null };
const reported = { id: "r2", username: "max", avatar_url: "a.png" };

beforeEach(() => {
  h.reset();
  h.tables.reports = (q) =>
    q.has("eq", "status", "pending")
      ? {
          data: [
            {
              id: 1,
              type: "user",
              status: "pending",
              created_at: "2026-11-10T10:00:00Z",
              reporter_id: "r1",
              reported_user_id: "r2",
              reporter,
              reported,
            },
          ],
        }
      : {
          data: [
            {
              id: 2,
              type: "contact",
              status: "resolved",
              created_at: "2026-11-09T10:00:00Z",
              reporter_id: null,
              reported_user_id: null,
              reporter: null,
              reported: null,
            },
          ],
        };
});

describe("admin/reports : chargement", () => {
  it("reporter et reported viennent de la ligne, aucune requête vers profiles", async () => {
    const { reports, error } = await load();
    expect(error).toBeNull();
    expect(reports.map((r) => r.id)).toEqual([1, 2]);
    expect(reports[0].reporter).toEqual(reporter);
    expect(reports[0].reported).toEqual(reported);
    expect(reports[1].reporter).toBeNull();
    expect(reports[1].reported).toBeNull();
    expect(h.all().some((q) => q.table === "profiles")).toBe(false);
  });

  it("les deux lectures embarquent les liens dans ops.reports", async () => {
    await load();
    const qs = h.admin.of("reports");
    expect(qs).toHaveLength(2);
    for (const q of qs) {
      expect(q.schema).toBe("ops");
      const sel = q.args("select")[0];
      expect(sel).toMatch(/reporter\(id, username, avatar_url\)/);
      expect(sel).toMatch(/reported\(id, username, avatar_url\)/);
    }
  });

  it("sans admin : refus avant toute lecture", async () => {
    expect(() => page.load({ locals: {} })).toThrow();
    expect(h.all()).toHaveLength(0);
  });

  it("erreur de lecture : message remonté", async () => {
    h.tables.reports = { data: null, error: { message: "boom" } };
    const { reports, error } = await load();
    expect(reports).toEqual([]);
    expect(error).toBe("boom");
  });
});
