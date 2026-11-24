import { describe, it, expect, afterEach, vi } from "vitest";

// Chaque io() rend un socket factice qu'on peut inspecter
const sockets = [];
vi.mock("socket.io-client", () => ({
  io: () => {
    const s = { on() {}, emit() {}, disconnect: vi.fn() };
    sockets.push(s);
    return s;
  },
}));
vi.mock("../playerEvents.js", () => ({ listenPlayer: () => {} }));

const { SalonPlayer } = await import("../salonPlayer.svelte.js");

describe("formulaire envoyé avant que la page soit prête", () => {
  afterEach(() => vi.unstubAllGlobals());

  function joueur(store = {}) {
    vi.stubGlobal("localStorage", { getItem: (k) => store[k] ?? null });
    const p = new SalonPlayer(null);
    p.codeInput = "ABC123";
    p.joining = true;
    return p;
  }

  it("rejoint au chargement avec le pseudo envoyé", () => {
    const p = joueur();
    const avant = sockets.length;
    p.checkResume("ABC123");
    p.joinPending("Julie");
    expect(sockets.length).toBe(avant + 1);
    expect(p.joinCode).toBe("ABC123");
    expect(p.usernameInput).toBe("Julie");
  });

  it("sans pseudo : rien ne part, le bouton redevient actif", () => {
    const p = joueur();
    const avant = sockets.length;
    p.joinPending("");
    expect(sockets.length).toBe(avant);
    expect(p.joining).toBe(false);
  });

  it("code incomplet : message du code, pas de connexion", () => {
    const p = joueur();
    p.codeInput = "ABC12";
    const avant = sockets.length;
    p.joinPending("Julie");
    expect(sockets.length).toBe(avant);
    expect(p.joinError).toMatch(/6 caractères/);
  });

  it("place déjà prise ici sous un autre pseudo : la carte de reprise reste", () => {
    const now = Date.now();
    const p = joueur({
      salon_code: "ABC123",
      salon_user: "Julie",
      salon_at: String(now),
      zik_salon_player_ABC123: "jeton",
    });
    p.checkResume("ABC123");
    const avant = sockets.length;
    p.joinPending("julie");
    expect(sockets.length).toBe(avant);
    expect(p.resume).toEqual({ code: "ABC123", username: "Julie" });
    expect(p.joining).toBe(false);
  });

  it("même pseudo que la place gardée : il la reprend", () => {
    const p = joueur({
      salon_code: "ABC123",
      salon_user: "Julie",
      salon_at: String(Date.now()),
      zik_salon_player_ABC123: "jeton",
    });
    p.checkResume("ABC123");
    const avant = sockets.length;
    p.joinPending("Julie");
    expect(sockets.length).toBe(avant + 1);
    expect(p.resume).toBeNull();
  });
});
