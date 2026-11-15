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

describe("QCM : la case ne se verrouille qu'à l'accusé du serveur", () => {
  // Socket factice : garde le rappel d'accusé pour y répondre à la main
  function joueur(connected = true) {
    const p = new SalonPlayer(null);
    const envoi = { emit: vi.fn((ev, data, cb) => (envoi.cb = cb)) };
    p.socket = { connected, timeout: vi.fn(() => envoi) };
    p.round = 3;
    return { p, envoi };
  }

  it("hors ligne : le tap ne part pas, rien n'est verrouillé, le joueur est prévenu", () => {
    const { p, envoi } = joueur(false);
    p.submitChoice(1);
    expect(p.chosenIndex).toBeNull();
    expect(p.allFound).toBe(false);
    expect(envoi.emit).not.toHaveBeenCalled();
    expect(p.feedback?.msg).toBe("Pas reçu, retape");
  });

  it("accusé reçu : la réponse est verrouillée", () => {
    const { p, envoi } = joueur();
    p.submitChoice(1);
    expect(p.socket.timeout).toHaveBeenCalledWith(3000);
    expect(p.allFound).toBe(false);
    p.submitChoice(2);
    expect(envoi.emit).toHaveBeenCalledTimes(1);
    envoi.cb(null, 1);
    expect(p.chosenIndex).toBe(1);
    expect(p.allFound).toBe(true);
  });

  it("le serveur avait déjà une réponse : c'est elle qui s'affiche", () => {
    const { p, envoi } = joueur();
    p.submitChoice(3);
    envoi.cb(null, 0);
    expect(p.chosenIndex).toBe(0);
    expect(p.allFound).toBe(true);
  });

  it("accusé perdu ou refus : la case est rendue", () => {
    const { p, envoi } = joueur();
    p.submitChoice(1);
    expect(p.feedback).toBeNull();
    envoi.cb(new Error("timeout"));
    expect(p.chosenIndex).toBeNull();
    expect(p.allFound).toBe(false);
    expect(p.feedback?.msg).toBe("Pas reçu, retape");
    p.submitChoice(2);
    envoi.cb(null, null);
    expect(p.chosenIndex).toBeNull();
    expect(p.allFound).toBe(false);
  });

  it("accusé tardif après la fin de manche : ignoré", () => {
    const { p, envoi } = joueur();
    p.submitChoice(1);
    p.round = 4;
    p.chosenIndex = null;
    envoi.cb(null, 1);
    expect(p.chosenIndex).toBeNull();
    expect(p.allFound).toBe(false);
  });
});
