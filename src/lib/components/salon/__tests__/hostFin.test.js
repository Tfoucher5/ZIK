import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../../client/salonClient.js", () => ({
  forgetSalon: () => {},
  takeSalonKeyFromUrl: () => null,
  patchSalonPlaylists: async () => {},
}));
vi.mock("socket.io-client", () => ({ io: () => ({}) }));

const { listenHost } = await import("../host/hostEvents.js");
const { SalonHost } = await import("../host/salonHost.svelte.js");
const { gameOverShown } = await import("../host/gameOverView.js");

function fauxSocket() {
  const handlers = {};
  return { handlers, on: (evt, fn) => (handlers[evt] = fn), emit: vi.fn() };
}
const rejoint = (extra = {}) => ({
  phase: "gameover",
  settings: {},
  players: [{ username: "Léa", score: 900 }],
  evening: { intermission: null, finale: null, qr: false },
  ...extra,
});

describe("TV de fin de partie", () => {
  let h;
  beforeEach(() => {
    vi.stubGlobal("localStorage", { setItem: () => {}, getItem: () => null });
    h = new SalonHost(null);
    h.socket = fauxSocket();
    listenHost(h, h.socket);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("le QR en grand suit le serveur, à l'arrivée puis en direct", () => {
    h.socket.handlers.salon_host_joined(
      rejoint({ evening: { intermission: null, finale: null, qr: true } }),
    );
    expect(h.qrBig).toBe(true);
    h.socket.handlers.salon_evening({ intermission: null, finale: null });
    expect(h.qrBig).toBe(false);
    h.socket.handlers.salon_evening({
      intermission: null,
      finale: null,
      qr: true,
    });
    expect(h.qrBig).toBe(true);
  });

  it("ancien serveur sans le champ qr : QR fermé", () => {
    h.socket.handlers.salon_host_joined(rejoint({ evening: null }));
    expect(h.qrBig).toBe(false);
  });

  it("ouvrir ou fermer le QR depuis la TV seule passe par le serveur", () => {
    h.setQrBig(true);
    expect(h.socket.emit).toHaveBeenCalledWith("salon_qr_big", { on: true });
    h.setQrBig(false);
    expect(h.socket.emit).toHaveBeenCalledWith("salon_qr_big", { on: false });
  });

  it("TV rechargée en fin de partie : la fin s'affiche, sans rejouer le podium", () => {
    h.socket.handlers.salon_host_joined(rejoint());
    expect(h.gameOver).toBeNull();
    expect(gameOverShown(h)).toBe(true);
    expect(h.overRevealed).toBe(true);
  });

  it("une nouvelle partie terminée se révèle, la relance cache la fin", () => {
    h.socket.handlers.salon_host_joined(rejoint());
    h.socket.handlers.salon_game_over({ scores: [], teams: null, night: null });
    expect(h.overRevealed).toBe(false);
    expect(gameOverShown(h)).toBe(true);
    h.socket.handlers.salon_restarted({ players: [] });
    expect(h.relaunching).toBe(true);
    expect(gameOverShown(h)).toBe(false);
    h.socket.handlers.salon_round_start({ round: 1, total: 10 });
    expect(h.relaunching).toBe(false);
  });
});

describe("TV : vrai nombre de manches (3 titres pour 5 manches)", () => {
  let h;
  beforeEach(() => {
    vi.stubGlobal("localStorage", { setItem: () => {}, getItem: () => null });
    h = new SalonHost(null);
    h.socket = fauxSocket();
    listenHost(h, h.socket);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("TV rechargée : « 2 / 3 », pas « 2 / 5 »", () => {
    h.socket.handlers.salon_host_joined(
      rejoint({
        phase: "round",
        currentRound: 2,
        settings: { maxRounds: 5, rounds: 3 },
      }),
    );
    expect(h.total).toBe(3);
  });

  it("le total suit les réglages en direct", () => {
    h.socket.handlers.salon_settings({ settings: { maxRounds: 5, rounds: 4 } });
    expect(h.total).toBe(4);
  });
});
