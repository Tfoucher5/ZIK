import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const goToStripe = vi.hoisted(() => vi.fn());
const attachSalonTo = vi.hoisted(() => vi.fn());
vi.mock("#lib/client/salonClient.js", async (orig) => ({
  ...(await orig()),
  goToStripe,
  attachSalonTo,
  fetchPro: async () => null,
}));
const { ProCheckout } = await import("../proCheckout.svelte.js");

function storage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

// Les effets ne tournent pas ici : arrive() puis resume() jouent l'ouverture
// de la page et la connexion
let zik;
async function start(search = "", user = null, hash = "#tarifs") {
  vi.stubGlobal("location", { search, hash });
  zik = { user, sb: {}, openAuthModal: vi.fn() };
  const c = new ProCheckout(zik);
  c.arrive();
  c.switchAccount(user?.id ?? null);
  if (user) await c.resume();
  return c;
}

const scroll = vi.fn();
beforeEach(() => {
  goToStripe.mockReset();
  attachSalonTo.mockReset();
  scroll.mockReset();
  vi.stubGlobal("localStorage", storage({ zik_salon_key_KZ4P2M: "cle" }));
  vi.stubGlobal("document", {
    getElementById: () => ({ scrollIntoView: scroll }),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("/pro sans régie : comme avant", () => {
  it("formule sans compte : gardée, connexion qui ramène sur /pro", async () => {
    const c = await start();
    c.buy("night");
    expect(zik.openAuthModal).toHaveBeenCalledWith("register", {
      next: "/pro",
    });
    expect(JSON.parse(localStorage.getItem("zik_pro_intent"))).toMatchObject({
      plan: "night",
      salon: null,
    });
    expect(c.regie).toBeNull();
  });

  it("connexion dans la page, sans rechargement : « Confirmer » s'ouvre", async () => {
    const c = await start();
    c.buy("monthly");
    zik.user = { id: "u1" };
    await c.resume();
    expect(c.confirmPlan).toBe("monthly");
    expect(localStorage.getItem("zik_pro_intent")).toBeNull();
    expect(goToStripe).not.toHaveBeenCalled();
  });

  it("connecté : fenêtre « Confirmer », mêmes arguments vers Stripe", async () => {
    const c = await start("", { id: "u1" });
    c.buy("monthly");
    expect(c.confirmPlan).toBe("monthly");
    goToStripe.mockResolvedValue(undefined);
    await c.pay();
    expect(goToStripe.mock.calls[0][2]).toEqual({
      plan: "monthly",
      confirm: true,
    });
  });

  it("formule choisie avant la connexion : reprise une fois connecté", async () => {
    localStorage.setItem(
      "zik_pro_intent",
      JSON.stringify({ plan: "night", salon: null, at: Date.now() }),
    );
    const c = await start("", { id: "u1" });
    expect(c.confirmPlan).toBe("night");
    expect(localStorage.getItem("zik_pro_intent")).toBeNull();
    expect(goToStripe).not.toHaveBeenCalled();
  });
});

describe("/pro depuis la régie", () => {
  const URL_REGIE = "?formule=night&salon=KZ4P2M";

  it("sans compte : étape compte, la connexion rappelle la suite", async () => {
    const c = await start(URL_REGIE);
    expect(c.regie).toBe("KZ4P2M");
    expect(c.step).toBe("compte");
    c.account("register");
    const [view, opts] = zik.openAuthModal.mock.calls[0];
    expect(view).toBe("register");
    expect(opts.next).toBe("/pro");
    expect(opts.note).toBe("Soirée 24 h · 7,90 € pour la soirée KZ4P2M");
    opts.onRegistered("bar@exemple.fr");
    expect(c.step).toBe("mail");
  });

  it("retour de Google (#access_token=…) : la page descend jusqu'au bloc", async () => {
    await start(URL_REGIE, null, "#access_token=abc");
    expect(scroll).toHaveBeenCalled();
    scroll.mockReset();
    await start(URL_REGIE, null, "#tarifs");
    expect(scroll).not.toHaveBeenCalled();
  });

  it("une carte change la formule, sans fenêtre ni connexion", async () => {
    const c = await start(URL_REGIE);
    c.buy("yearly");
    expect(c.intent.plan).toBe("yearly");
    expect(c.confirmPlan).toBeNull();
    expect(zik.openAuthModal).not.toHaveBeenCalled();
  });

  it("connecté : rattache sans payer, puis paie sans « Confirmer »", async () => {
    attachSalonTo.mockResolvedValueOnce({ activated: false });
    const c = await start(URL_REGIE, { id: "u1" });
    expect(attachSalonTo.mock.calls[0].slice(1, 3)).toEqual(["KZ4P2M", "cle"]);
    expect(goToStripe).not.toHaveBeenCalled();
    expect(c.attached).toBe(true);
    expect(c.step).toBe("payer");
    goToStripe.mockResolvedValueOnce(undefined);
    await c.payDirect();
    expect(goToStripe.mock.calls[0][2]).toEqual({
      plan: "night",
      salon: "KZ4P2M",
      key: "cle",
    });
    expect(c.confirmPlan).toBeNull();
  });

  it("compte déjà Pro : rien à payer, intention effacée", async () => {
    attachSalonTo.mockResolvedValueOnce({ activated: true });
    const c = await start(URL_REGIE, { id: "u1" });
    expect(c.step).toBe("actif");
    expect(localStorage.getItem("zik_pro_intent")).toBeNull();
    expect(goToStripe).not.toHaveBeenCalled();
  });

  it("soirée refusée : l'erreur, pas de paiement, puis sortie sans la soirée", async () => {
    attachSalonTo.mockRejectedValueOnce(
      Object.assign(new Error("Cette soirée n'est plus en cours."), {
        refused: true,
      }),
    );
    const c = await start(URL_REGIE, { id: "u1" });
    expect(c.attachError).toBe("Cette soirée n'est plus en cours.");
    expect(c.attachRefused).toBe(true);
    expect(c.attached).toBe(false);
    c.withoutSoiree();
    expect(c.attachRefused).toBe(false);
    expect(c.regie).toBeNull();
    expect(c.attachError).toBe("");
    expect(c.confirmPlan).toBe("night");
    expect(localStorage.getItem("zik_pro_intent")).toBeNull();
    expect(goToStripe).not.toHaveBeenCalled();
  });

  it("panne au rattachement : pas un refus, un réessai rattache", async () => {
    attachSalonTo.mockRejectedValueOnce(new Error("Panne."));
    const c = await start(URL_REGIE, { id: "u1" });
    expect(c.attachError).toBe("Panne.");
    expect(c.attachRefused).toBe(false);
    expect(c.regie).toBe("KZ4P2M");
    attachSalonTo.mockResolvedValueOnce({ activated: false });
    await c.attach();
    expect(c.attached).toBe(true);
    expect(c.attachError).toBe("");
    expect(c.step).toBe("payer");
    expect(goToStripe).not.toHaveBeenCalled();
  });

  it("autre compte : le rattachement est refait", async () => {
    attachSalonTo.mockResolvedValue({ activated: true });
    const c = await start(URL_REGIE, { id: "u1" });
    c.switchAccount("u1");
    expect(c.attached).toBe(true);
    c.switchAccount("u2");
    expect(c.attached).toBe(false);
    expect(c.activated).toBe(false);
  });
});
