import { it, expect, vi } from "vitest";

vi.mock("../../../client/salonClient.js", () => ({
  forgetSalon: () => {},
  takeSalonKeyFromUrl: () => null,
  patchSalonPlaylists: async () => {},
}));
vi.mock("socket.io-client", () => ({ io: () => ({}) }));

const { listenRegie } = await import("../regie/regieEvents.js");

function regie() {
  const handlers = {};
  const socket = { on: (evt, fn) => (handlers[evt] = fn), emit: vi.fn() };
  const r = {
    code: "ABCDEF",
    settings: { maxRounds: 5, rounds: 3 },
    players: [],
    history: [],
    short: null,
    flash: vi.fn(),
    applyScores: vi.fn(),
  };
  listenRegie(r, socket);
  return { r, handlers };
}

it("régie : le total de chaque manche vient du serveur", () => {
  const { r, handlers } = regie();
  handlers.salon_round_start({ round: 1, total: 3, hostInfo: null });
  expect(r.settings).toEqual({ maxRounds: 5, rounds: 3 });
});

it("régie : titre injouable sans réserve, total baissé et phrase jusqu'à la fin de la manche", () => {
  const { r, handlers } = regie();
  handlers.salon_short({ rounds: 2 });
  expect(r.settings.rounds).toBe(2);
  expect(r.short).toBe(2);
  handlers.salon_round_end({ answer: "A - b", scores: [], teams: null });
  expect(r.short).toBeNull();
});
