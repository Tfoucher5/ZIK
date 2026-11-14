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

function rejoint(p, code) {
  p.codeInput = code;
  p.usernameInput = "Ana";
  p.connectAndJoin();
}

describe("téléphone : une seule connexion à la fois", () => {
  it("changer de salon ferme la connexion à l'ancien", () => {
    const p = new SalonPlayer(null);
    rejoint(p, "AAAAAA");
    rejoint(p, "BBBBBB");
    expect(sockets[0].disconnect).toHaveBeenCalled();
    expect(sockets[1].disconnect).not.toHaveBeenCalled();
  });

  it("« Rejoindre une autre soirée » ferme la connexion : après une coupure, elle ne ramène pas au salon d'avant", () => {
    const p = new SalonPlayer(null);
    rejoint(p, "CCCCCC");
    const s = sockets.at(-1);
    p.leave();
    expect(s.disconnect).toHaveBeenCalled();
    expect(p.socket).toBeNull();
  });
});

describe("« Rejoindre une autre soirée » puis rechargement", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("ne propose plus de reprendre la place dans l'ancien salon", () => {
    const store = { salon_at: String(Date.now()), salon_user: "Ana" };
    vi.stubGlobal("localStorage", {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => (store[k] = v),
      removeItem: (k) => delete store[k],
    });
    const p = new SalonPlayer(null);
    rejoint(p, "DDDDDD");
    p.leave();
    expect(store.salon_at).toBeUndefined();
    expect(store.salon_user).toBe("Ana");
  });
});

describe("chargement de la page sur un téléphone lent", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("garde le code et le pseudo tapés avant la fin du chargement", () => {
    vi.stubGlobal("localStorage", { getItem: () => null });
    const p = new SalonPlayer(null);
    p.codeInput = "EEEEEE";
    p.usernameInput = "Julie";
    p.checkResume("");
    expect(p.codeInput).toBe("EEEEEE");
    expect(p.usernameInput).toBe("Julie");
  });

  it("le code de l'URL et le pseudo mémorisé passent avant le formulaire vide", () => {
    const store = { salon_user: "Ana" };
    vi.stubGlobal("localStorage", { getItem: (k) => store[k] ?? null });
    const p = new SalonPlayer(null);
    p.checkResume("FFFFFF");
    expect(p.codeInput).toBe("FFFFFF");
    expect(p.usernameInput).toBe("Ana");
  });

  it("le pseudo tapé passe avant le pseudo mémorisé", () => {
    vi.stubGlobal("localStorage", {
      getItem: (k) => (k === "salon_user" ? "Ana" : null),
    });
    const p = new SalonPlayer(null);
    p.usernameInput = "Julie";
    p.checkResume("");
    expect(p.usernameInput).toBe("Julie");
  });
});
