import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../../client/salonClient.js", () => ({ forgetSalon: () => {} }));
const { listenRegie } = await import("../regie/regieEvents.js");
const { RegiePro, noms, textesFile } =
  await import("../regie/regiePro.svelte.js");

const HEURE = 60 * 60 * 1000;
const FILE = ["Hugo", "Lina", "Malo"];

describe("régie : les noms de ceux qui attendent", () => {
  it("1, 2, 3 et 28 personnes", () => {
    expect(noms(["Hugo"], 1)).toBe("Hugo");
    expect(noms(["Hugo", "Lina"], 2)).toBe("Hugo et Lina");
    expect(noms(FILE, 3)).toBe("Hugo, Lina et Malo");
    expect(noms(FILE, 28)).toBe("Hugo, Lina, Malo et 25 autres");
    expect(noms(FILE, 4)).toBe("Hugo, Lina, Malo et 1 autre");
    expect(noms([], 2)).toBe("2 personnes");
  });

  it("au singulier, sans genre", () => {
    const t = textesFile(["Hugo"], 1);
    expect(t.titre).toBe("Fais entrer Hugo");
    expect(t.attendent).toBe("Hugo attend.");
    expect(t.resume).toBe("Complet · 1 attend");
    expect(t.siPlace).toBe("Hugo entre si une place se libère.");
    expect(t.entres).toBe("Hugo a pris sa place.");
  });

  it("au pluriel", () => {
    const t = textesFile(FILE, 28);
    expect(t.titre).toBe("Fais-les entrer");
    expect(t.attendent).toBe("Hugo, Lina, Malo et 25 autres attendent.");
    expect(t.sousTitre).toBe("28 attendent à l'entrée");
    expect(t.entres).toBe("Hugo, Lina, Malo et 25 autres ont pris leur place.");
  });
});

describe("régie : offre, paiement en cours, activé", () => {
  let store, open;
  beforeEach(() => {
    vi.useFakeTimers();
    store = {};
    open = vi.fn();
    vi.stubGlobal("window", { open });
    vi.stubGlobal("localStorage", {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => (store[k] = v),
      removeItem: (k) => delete store[k],
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function regie() {
    const h = {};
    const r = {
      code: "KZ4P2M",
      players: [],
      mergeRoster: () => {},
      chat: { update: () => {} },
    };
    r.offre = new RegiePro(r);
    listenRegie(r, { on: (evt, fn) => (h[evt] = fn), emit: () => {} });
    return { r, h };
  }

  it("ouvre /pro avec la formule et le code, jamais la clé, sans noopener", () => {
    const { r } = regie();
    r.key = "secret";
    r.offre.buy("night");
    expect(open).toHaveBeenCalledWith(
      "/pro?formule=night&salon=KZ4P2M#tarifs",
      "_blank",
    );
    r.offre.buy();
    expect(open).toHaveBeenLastCalledWith("/pro?salon=KZ4P2M#tarifs", "_blank");
    expect(JSON.stringify(open.mock.calls)).not.toContain("secret");
  });

  it("le paiement en cours retombe sur l'offre au bout d'une heure", () => {
    const { r } = regie();
    r.offre.buy("night");
    expect(r.offre.paiement).toBe(true);
    expect(store.zik_regie_pro_KZ4P2M).toBeTruthy();
    vi.advanceTimersByTime(HEURE - 1000);
    expect(r.offre.paiement).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(r.offre.paiement).toBe(false);
    expect(store.zik_regie_pro_KZ4P2M).toBeUndefined();
  });

  it("les abonnements n'ouvrent pas d'état de paiement", () => {
    const { r } = regie();
    r.offre.buy();
    expect(r.offre.paiement).toBe(false);
  });

  it("régie rechargée : le paiement en cours reprend pour le temps restant", () => {
    store.zik_regie_pro_KZ4P2M = String(Date.now() - HEURE / 2);
    const { r, h } = regie();
    h.salon_control_joined({ pro: false, settings: {}, players: [] });
    expect(r.offre.paiement).toBe(true);
    vi.advanceTimersByTime(HEURE / 2);
    expect(r.offre.paiement).toBe(false);
  });

  it("un paiement de plus d'une heure est oublié", () => {
    store.zik_regie_pro_KZ4P2M = String(Date.now() - HEURE - 1);
    const { r, h } = regie();
    h.salon_control_joined({ pro: false, settings: {}, players: [] });
    expect(r.offre.paiement).toBe(false);
    expect(store.zik_regie_pro_KZ4P2M).toBeUndefined();
  });

  it("activé pendant que la régie dormait : la carte s'affiche au retour", () => {
    store.zik_regie_pro_KZ4P2M = String(Date.now());
    const { r, h } = regie();
    h.salon_control_joined({ pro: true, settings: {}, players: [] });
    expect(r.offre.entres).toEqual({ count: 0, names: [] });
    expect(r.offre.paiement).toBe(false);
    expect(store.zik_regie_pro_KZ4P2M).toBeUndefined();
    r.offre.ack();
    expect(r.offre.entres).toBe(null);
  });

  it("déjà Pro sans paiement lancé d'ici : pas de carte", () => {
    const { r, h } = regie();
    h.salon_control_joined({ pro: true, settings: {}, players: [] });
    expect(r.offre.entres).toBe(null);
  });

  it("régie gratuite endormie, payée ailleurs : la carte s'affiche au réveil", () => {
    const { r, h } = regie();
    h.salon_control_joined({ pro: false, settings: {}, players: [] });
    h.salon_control_joined({ pro: true, settings: {}, players: [] });
    expect(r.offre.entres).toEqual({ count: 0, names: [] });
  });

  it("déjà Pro, reconnexion : pas de nouvelle carte", () => {
    const { r, h } = regie();
    h.salon_control_joined({ pro: true, settings: {}, players: [] });
    h.salon_control_joined({ pro: true, settings: {}, players: [] });
    expect(r.offre.entres).toBe(null);
  });

  it("salon_pro à faux : pas de carte, le minuteur s'arrête avec la régie", () => {
    const { r, h } = regie();
    r.offre.buy("night");
    h.salon_pro({ pro: false });
    expect(r.offre.entres).toBe(null);
    expect(r.offre.paiement).toBe(true);
    r.offre.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("salon_pro avant la file vide : la carte garde les noms entrés", () => {
    const { r, h } = regie();
    h.salon_queue({ count: 3, names: FILE });
    r.offre.buy("night");
    h.salon_pro({ pro: true });
    h.salon_queue({ count: 0, names: [] });
    expect(r.pro).toBe(true);
    expect(r.offre.paiement).toBe(false);
    expect(r.offre.entres).toEqual({ count: 3, names: FILE });
    expect(r.offre.count).toBe(0);
  });

  it("soirée complète : plus de fenêtre par-dessus, les autres verrous oui", () => {
    const { r, h } = regie();
    h.salon_pro_required({ feature: "players" });
    expect(r.upsell).toBeUndefined();
    h.salon_pro_required({ feature: "reveal" });
    expect(r.upsell).toBe("reveal");
  });

  it("file mal formée : rien ne casse", () => {
    const { r, h } = regie();
    h.salon_queue({ count: "3", names: "Hugo" });
    expect(r.offre.count).toBe(0);
    expect(r.offre.names).toEqual([]);
    h.salon_queue({ count: 2, names: ["Hugo", 42, { x: 1 }] });
    expect(r.offre.names).toEqual(["Hugo"]);
  });
});
