import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../../client/salonClient.js", () => ({
  forgetSalon: () => {},
  takeSalonKeyFromUrl: () => null,
  patchSalonPlaylists: async () => {},
}));
vi.mock("socket.io-client", () => ({ io: () => ({}) }));

const { listenHost } = await import("../host/hostEvents.js");
const { listenRegie } = await import("../regie/regieEvents.js");
const { SalonHost } = await import("../host/salonHost.svelte.js");

function fauxSocket() {
  const handlers = {};
  return { handlers, on: (evt, fn) => (handlers[evt] = fn), emit: vi.fn() };
}

describe("volume de la TV", () => {
  let h;
  beforeEach(() => {
    vi.stubGlobal("localStorage", { setItem: () => {}, getItem: () => null });
    h = new SalonHost(null);
    h.socket = fauxSocket();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("remettre le son revient au volume d'avant, pas à 100", () => {
    h.applyVolume(35);
    h.toggleMute();
    expect(h.volume).toBe(0);
    h.toggleMute();
    expect(h.volume).toBe(35);
  });

  it("un réglage fait sur la TV est annoncé à la régie", () => {
    h.applyVolume(40);
    expect(h.socket.emit).toHaveBeenCalledWith("salon_tv_volume", {
      volume: 40,
    });
  });

  it("un réglage venu de la régie n'est pas renvoyé", () => {
    listenHost(h, h.socket);
    h.socket.handlers.salon_volume({ volume: 70 });
    expect(h.volume).toBe(70);
    expect(h.socket.emit).not.toHaveBeenCalled();
  });

  it("la TV retient le nombre de régies pour le badge", () => {
    listenHost(h, h.socket);
    h.socket.handlers.salon_controls({ count: 2 });
    expect(h.controls).toBe(2);
  });
});

describe("volume vu par la régie", () => {
  it("affiche le vrai volume de la TV, à l'arrivée puis en direct", () => {
    const s = fauxSocket();
    const r = {
      volume: 100,
      settings: {},
      mergeRoster: () => {},
      chat: { update: () => {} },
    };
    listenRegie(r, s);
    s.handlers.salon_control_joined({
      settings: {},
      players: [],
      tvVolume: 25,
    });
    expect(r.volume).toBe(25);
    s.handlers.salon_volume({ volume: 60 });
    expect(r.volume).toBe(60);
  });
});

describe("reprise de la TV", () => {
  it("la TV redonne son volume à la régie à chaque arrivée", () => {
    vi.stubGlobal("localStorage", { setItem: () => {}, getItem: () => null });
    const h = new SalonHost(null);
    h.socket = fauxSocket();
    h.applyVolume(35);
    h.socket.emit.mockClear();
    listenHost(h, h.socket);
    h.socket.handlers.salon_host_joined({ settings: {}, players: [] });
    expect(h.socket.emit).toHaveBeenCalledWith("salon_tv_volume", {
      volume: 35,
    });
    vi.unstubAllGlobals();
  });
});
