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
  availabilityOf,
  incidentsFrom,
  publicLevel,
  publicStatus,
  adminStatus,
  resetStatusCache,
  GROUPS,
} = await import("../status.js");
const { runChecks, resetHealth, healthState } = await import("../monitor.js");

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

  it("changement d'heure : 30 jours distincts et consécutifs, même vers minuit", () => {
    // 23 h 30 à Paris, 10 jours après le passage à l'heure d'hiver
    for (const now of [
      Date.parse("2026-11-04T22:30:00Z"),
      Date.parse("2026-04-05T21:45:00Z"),
    ]) {
      const days = lastDays(30, now);
      expect(new Set(days).size).toBe(30);
      for (let i = 1; i < 30; i++)
        expect(Date.parse(days[i]) - Date.parse(days[i - 1])).toBe(86_400_000);
    }
    expect(lastDays(1, Date.parse("2026-11-04T22:30:00Z"))).toEqual([
      "2026-11-04",
    ]);
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
    // Trois lectures au premier appel, aucune tant que le cache tient
    expect(lectures).toBe(3);
  });

  it("serveur qui vient de démarrer ou base en panne : la page le dit au lieu de mentir", async () => {
    panne = true;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const s = await publicStatus(NOW);
    warn.mockRestore();
    expect(s).toMatchObject({ checked: false, historyAvailable: false });
  });

  it("les pages lisent ce que le moniteur écrit, même dans une autre copie du module", async () => {
    // server.js et le build SvelteKit chargent chacun leur copie : c'est ce qui
    // laissait /statut sur « Vérification en cours » pour toujours
    await runChecks({
      probes: { db: async () => ({ result: "ok", value: 42 }) },
      record: async () => {},
      alert: () => {},
    });
    vi.resetModules();
    const copie = await import("../status.js");
    copie.resetStatusCache();
    const s = await copie.publicStatus(NOW);
    expect(s.checked).toBe(true);
    expect(copie.publicLevel()).toBe("ok");
  });

  it("disponibilité : hors incident, jamais 100 % avec un incident, la pire sonde fait foi", () => {
    const rows = [
      { probe: "db", level: "ok", checks: 9999 },
      { probe: "db", level: "incident", checks: 1 },
      { probe: "auth", level: "ok", checks: 90 },
      { probe: "auth", level: "suspect", checks: 10 },
    ];
    expect(availabilityOf(rows, ["db"])).toBe(99.9);
    expect(availabilityOf(rows, ["auth"])).toBe(100);
    expect(availabilityOf(rows, ["db", "auth"])).toBe(99.9);
    expect(availabilityOf(rows, ["inconnue"])).toBeNull();
    expect(availabilityOf(null, ["db"])).toBeNull();
  });

  it("incidents : du début à la fin, en cours, sans les simples suspicions", () => {
    const t = (h) => `2026-11-0${h}T10:00:00Z`;
    const rows = [
      { probe: "db", level: "ok", checked_at: t(1) },
      { probe: "db", level: "suspect", checked_at: t(2) },
      { probe: "db", level: "incident", checked_at: t(3) },
      { probe: "db", level: "ok", checked_at: t(4) },
      { probe: "auth", level: "suspect", checked_at: t(4) },
      { probe: "auth", level: "ok", checked_at: t(5) },
      { probe: "stripe", level: "incident", checked_at: t(6) },
      { probe: "load", level: "incident", checked_at: t(7) },
    ];
    expect(incidentsFrom(rows, ["db", "auth", "stripe"])).toEqual([
      {
        probe: "stripe",
        label: "Paiements (Stripe et webhook)",
        startedAt: t(6),
        endedAt: null,
      },
      {
        probe: "db",
        label: "Base de données",
        startedAt: t(3),
        endedAt: t(4),
      },
    ]);
  });

  it("incidents : une sonde qui reste en incident puis repart n'en fait qu'un", () => {
    const rows = [
      { probe: "db", level: "incident", checked_at: "2026-11-01T10:00:00Z" },
      { probe: "db", level: "incident", checked_at: "2026-11-01T10:05:00Z" },
      { probe: "db", level: "ok", checked_at: "2026-11-01T10:10:00Z" },
    ];
    expect(incidentsFrom(rows, ["db"])).toHaveLength(1);
    expect(incidentsFrom(null, ["db"])).toEqual([]);
  });

  it("public : temps de réponse oui, messages d'erreur et salons ouverts non", async () => {
    await runChecks({
      probes: {
        db: async () => ({
          result: "fail",
          value: 80,
          detail: "secret interne",
        }),
        memory: async () => ({ result: "ok", value: 512 }),
        load: async () => ({ result: "ok", value: 7 }),
      },
      record: async () => {},
      alert: () => {},
    });
    const s = await publicStatus(NOW);
    const texte = JSON.stringify(s);
    expect(texte).not.toContain("secret interne");
    expect(texte).not.toContain('"load"');
    const site = s.groups.find((g) => g.id === "site").probes;
    expect(site.find((p) => p.id === "db")).toMatchObject({
      level: "suspect",
      ms: null,
    });
    expect(texte).not.toContain('"memory"');
    expect(texte).not.toContain("512");
    for (const mot of [
      "Socket.io",
      "Resend",
      "webhook",
      "Stripe et",
      "Spotify",
    ])
      expect(texte).not.toContain(mot);
  });

  it("juste après un démarrage : l'attente n'est pas gardée en cache", async () => {
    expect((await publicStatus(NOW)).checked).toBe(false);
    await runChecks({
      probes: { db: async () => ({ result: "ok" }) },
      record: async () => {},
      alert: () => {},
    });
    expect((await publicStatus(NOW + 1000)).checked).toBe(true);
  });

  it("pied de page : une salle sans musique n'affiche pas d'incident partout", async () => {
    for (let i = 0; i < 3; i++)
      await runChecks({
        probes: { media: async () => ({ result: "fail" }) },
        record: async () => {},
        alert: () => {},
      });
    expect(healthState().probes.media.level).toBe("incident");
    expect(publicLevel()).toBe("ok");
  });

  it("pied de page : rien tant qu'aucune sonde n'est passée", async () => {
    expect(publicLevel()).toBeNull();
    const passe = () =>
      runChecks({
        probes: { stripe: async () => ({ result: "fail" }) },
        record: async () => {},
        alert: () => {},
      });
    // Un échec isolé reste discret, trois de suite font un incident
    await passe();
    expect(publicLevel()).toBe("ok");
    await passe();
    await passe();
    expect(publicLevel()).toBe("incident");
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
    expect(a.historyAvailable).toBe(true);
  });
});
