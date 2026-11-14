import { it, expect, vi } from "vitest";

vi.mock("../../../client/salonClient.js", () => ({
  forgetSalon: () => {},
  takeSalonKeyFromUrl: () => null,
  patchSalonPlaylists: async () => {},
}));
vi.mock("socket.io-client", () => ({ io: () => ({}) }));

const { listenRegie } = await import("../regie/regieEvents.js");

it("régie : la playlist affichée suit le changement sans recharger", () => {
  const handlers = {};
  const socket = { on: (evt, fn) => (handlers[evt] = fn), emit: vi.fn() };
  const r = {
    code: "ABCDEF",
    settings: { playlistIds: ["a"], maxRounds: 10 },
    flash: vi.fn(),
  };
  listenRegie(r, socket);
  handlers.salon_playlists_changed({
    playlistIds: ["b", "c"],
    trackCount: 40,
    appliedNow: false,
  });
  expect(r.settings).toEqual({ playlistIds: ["b", "c"], maxRounds: 10 });
  expect(r.flash).toHaveBeenCalled();
});
