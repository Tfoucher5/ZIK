import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const forgetSalon = vi.hoisted(() => vi.fn());
vi.mock("../../../client/salonClient.js", () => ({
  forgetSalon,
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

describe("soirée fermée : la TV et la régie repartent sur /salon", () => {
  let location;
  beforeEach(() => {
    forgetSalon.mockClear();
    location = { href: "/salon/regie?code=ABCDEF" };
    vi.stubGlobal("window", { location });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("TV : oublie la soirée et revient à la création", () => {
    const s = fauxSocket();
    listenHost({ code: "ABCDEF" }, s);
    s.handlers.salon_closed({ message: "L'hôte a fermé la soirée." });
    expect(forgetSalon).toHaveBeenCalledWith("ABCDEF");
    expect(location.href).toBe("/salon");
  });

  it("régie : oublie la soirée et revient à la création", () => {
    const s = fauxSocket();
    listenRegie({ code: "ABCDEF" }, s);
    s.handlers.salon_closed({ message: "L'hôte a fermé la soirée." });
    expect(forgetSalon).toHaveBeenCalledWith("ABCDEF");
    expect(location.href).toBe("/salon");
  });

  it("« Nouveau salon » sur la TV ferme l'ancien, et part même sans réponse", () => {
    vi.useFakeTimers();
    const h = new SalonHost(null);
    h.socket = fauxSocket();
    h.closeSalon();
    expect(h.socket.emit).toHaveBeenCalledWith("salon_close");
    expect(location.href).not.toBe("/salon");
    vi.advanceTimersByTime(2000);
    expect(location.href).toBe("/salon");
  });
});
