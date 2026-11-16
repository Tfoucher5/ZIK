import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../../client/salonClient.js", () => ({
  forgetSalon: () => {},
  takeSalonKeyFromUrl: () => null,
  patchSalonPlaylists: async () => {},
}));
vi.mock("socket.io-client", () => ({ io: () => ({}) }));

const { listenHost } = await import("../host/hostEvents.js");
const { SalonHost } = await import("../host/salonHost.svelte.js");
const { prepShown } = await import("../host/lobbyView.js");

function fauxSocket() {
  const handlers = {};
  return { handlers, on: (evt, fn) => (handlers[evt] = fn), emit: vi.fn() };
}

const rejoint = (phase) => ({ phase, settings: {}, players: [], teams: null });

describe("Prépare la TV", () => {
  let h, store;
  beforeEach(() => {
    store = {};
    vi.stubGlobal("localStorage", {
      setItem: (k, v) => (store[k] = v),
      getItem: (k) => store[k] ?? null,
    });
    h = new SalonHost(null);
    h.code = "KZ4P2M";
    h.socket = fauxSocket();
    listenHost(h, h.socket);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("le son testé part à la régie, et repart à chaque reconnexion", () => {
    h.socket.handlers.salon_host_joined(rejoint("lobby"));
    expect(h.socket.emit).not.toHaveBeenCalledWith(
      "salon_tv_sound",
      expect.anything(),
    );
    h.setTvSound(true);
    expect(h.socket.emit).toHaveBeenCalledWith("salon_tv_sound", { ok: true });
    h.socket.emit.mockClear();
    h.socket.handlers.salon_host_joined(rejoint("lobby"));
    expect(h.socket.emit).toHaveBeenCalledWith("salon_tv_sound", { ok: true });
  });

  it("une TV rechargée en pleine partie saute la prépa, même après la partie", () => {
    h.socket.handlers.salon_host_joined(rejoint("round"));
    h.phase = "lobby";
    expect(prepShown(h)).toBe(false);
  });

  it("une partie lancée par la régie pendant la prépa la referme pour de bon", () => {
    h.socket.handlers.salon_host_joined(rejoint("lobby"));
    expect(prepShown(h)).toBe(true);
    h.socket.handlers.salon_game_starting();
    h.phase = "lobby";
    expect(prepShown(h)).toBe(false);
  });

  it("la file à l'entrée : la TV garde le nombre, 0 quand elle se vide", () => {
    expect(h.waiting).toBe(0);
    h.socket.handlers.salon_queue({ count: 3 });
    expect(h.waiting).toBe(3);
    h.socket.handlers.salon_queue({ count: 0 });
    expect(h.waiting).toBe(0);
  });

  it("« Afficher le code » est retenu pour ce salon", () => {
    h.showCode();
    expect(h.prepDone).toBe(true);
    expect(store.zik_salon_prep).toBe("KZ4P2M");
  });

  it("stockage indisponible : le code s'affiche quand même", () => {
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw new Error("plein");
      },
    });
    h.showCode();
    expect(h.prepDone).toBe(true);
  });
});
