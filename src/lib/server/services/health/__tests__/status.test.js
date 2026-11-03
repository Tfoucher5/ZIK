import { describe, it, expect, beforeEach, vi } from "vitest";

let rows = [];
let panne = false;
let lectures = 0;
vi.mock("../../../config.js", () => ({
  getAdminClient: () => ({
    rpc: async () => {
      lectures++;
      return panne
        ? { error: { message: "base injoignable" } }
        : { data: rows, error: null };
    },
  }),
}));
vi.mock("../../admin/alerts.js", () => ({ alertAdminsSafe: () => {} }));
vi.mock("../../../mail/send.js", () => ({
  ADMIN_EMAIL: "",
  sendMail: async () => {},
}));

const {
  lastDays,
  historyBy,
  publicStatus,
  adminStatus,
  resetStatusCache,
  GROUPS,
} = await import("../status.js");
const { runChecks, resetHealth } = await import("../monitor.js");

const NOW = Date.parse("2026-11-04T10:00:00Z");

describe("pages de statut", () => {
  beforeEach(() => {
    resetHealth();
    resetStatusCache();
    rows = [];
    panne = false;
    lectures = 0;
  });

  it("30 jours à l'heure de Paris, aujourd'hui en dernier", () => {
    const days = lastDays(30, NOW);
    expect(days).toHaveLength(30);
    expect(days.at(-1)).toBe("2026-11-04");
    expect(days[0]).toBe("2026-10-06");
  });

  it("un groupe prend le pire niveau de ses sondes chaque jour, null sans mesure", () => {
    const days = ["2026-11-02", "2026-11-03", "2026-11-04"];
    const h = historyBy(
      [
        { day: "2026-11-03", probe: "youtube", level: "suspect" },
        { day: "2026-11-03", probe: "deezer", level: "incident" },
        { day: "2026-11-04", probe: "deezer", level: "ok" },
        { day: "2026-11-04", probe: "inconnue", level: "incident" },
      ],
      GROUPS,
      days,
    );
    expect(h.musique).toEqual([null, "incident", "ok"]);
    expect(h.site).toEqual([null, null, null]);
  });

  it("public : état courant par service, historique, et cache d'une minute", async () => {
    await runChecks({
      probes: {
        db: async () => ({ result: "ok" }),
        youtube: async () => ({ result: "fail" }),
      },
      record: async () => {},
      alert: () => {},
    });
    rows = [{ day: "2026-11-04", probe: "youtube", level: "suspect" }];
    const s = await publicStatus(NOW);
    expect(s.checked).toBe(true);
    expect(s.groups.find((g) => g.id === "musique")).toMatchObject({
      level: "suspect",
    });
    expect(s.groups.find((g) => g.id === "site").level).toBe("ok");
    expect(s.groups[0].history).toHaveLength(30);
    await publicStatus(NOW + 30_000);
    expect(lectures).toBe(1);
  });

  it("serveur qui vient de démarrer ou base en panne : la page le dit au lieu de mentir", async () => {
    panne = true;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const s = await publicStatus(NOW);
    warn.mockRestore();
    expect(s).toMatchObject({ checked: false, historyAvailable: false });
  });

  it("admin : chaque sonde, mesurée ou non", async () => {
    await runChecks({
      probes: { db: async () => ({ result: "ok", value: 42 }) },
      record: async () => {},
      alert: () => {},
    });
    const a = await adminStatus(NOW);
    expect(a.probes.find((p) => p.id === "db")).toMatchObject({
      label: "Base de données",
      level: "ok",
      value: 42,
    });
    expect(a.probes.find((p) => p.id === "deezer").level).toBeNull();
  });
});
