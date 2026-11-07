import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const socket = vi.hoisted(() => {
  const handlers = {};
  return {
    id: "s1",
    connected: true,
    handlers,
    on: (evt, fn) => (handlers[evt] = fn),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };
});
vi.mock("socket.io-client", () => ({ io: () => socket }));
vi.mock("$app/navigation", () => ({ goto: () => {} }));

const { joinPayload, joinRoom } = await import("../gameSocket.js");
const { gameHandlers } = await import("../gameHandlers.js");

const envois = () => socket.emit.mock.calls.map(([, p]) => p);
const attendEnvois = (n) =>
  vi.waitFor(() => expect(socket.emit).toHaveBeenCalledTimes(n));
const page = (extra = {}) => ({
  connected: () => {},
  roomJoined: vi.fn(),
  accountUnverified: vi.fn(),
  ...extra,
});
const session = (extra = {}) => ({
  roomId: "R",
  username: "alice",
  userId: "u-alice",
  isGuest: false,
  getToken: async () => "jwt",
  later: () => {},
  ...extra,
});

beforeEach(() => {
  socket.emit.mockClear();
  socket.id = "s1";
  socket.connected = true;
});

describe("connexion à une room", () => {
  it("un seul join_room au départ, puis le socket de la place à chaque reconnexion", async () => {
    await joinRoom(page(), async (extra = {}) => ({ roomId: "R", ...extra }));
    socket.handlers.connect();
    await attendEnvois(1);
    expect(envois()[0]).toEqual({ roomId: "R" });

    // Coupure avant d'avoir reçu sa place : pas de preuve, mais on rejoint quand même
    socket.id = "s2";
    socket.handlers.connect();
    await attendEnvois(2);
    expect(envois()[1].prevSid).toBeNull();
    socket.handlers.room_joined({ roomConfig: { isGuest: true } });

    socket.id = "s3";
    socket.handlers.connect();
    await attendEnvois(3);
    expect(envois()[2].prevSid).toBe("s2");
  });
});

describe("compte non reconnu par le serveur", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("prévient, retente au plus 3 fois, puis dit clairement que c'est fini", async () => {
    const h = page();
    await joinRoom(h, joinPayload(session()));
    await vi.advanceTimersByTimeAsync(0);
    expect(socket.emit).toHaveBeenCalledTimes(1);

    for (let essai = 1; essai <= 4; essai++) {
      socket.handlers.room_joined({ roomConfig: { isGuest: true } });
      await vi.advanceTimersByTimeAsync(10_000);
    }

    const messages = h.accountUnverified.mock.calls.map(([m]) => m);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain("Nouvel essai");
    expect(messages[1]).toContain("Recharge la page");
    expect(socket.emit).toHaveBeenCalledTimes(4);
    // Le jeton repart à chaque essai, le statut d'invité ne le coupe pas
    expect(envois().at(-1)).toMatchObject({ isGuest: false, token: "jwt" });
  });

  it("compte reconnu au nouvel essai : plus de message ni d'essai", async () => {
    const h = page();
    await joinRoom(h, joinPayload(session()));
    await vi.advanceTimersByTimeAsync(0);
    socket.handlers.room_joined({ roomConfig: { isGuest: true } });
    await vi.advanceTimersByTimeAsync(10_000);
    socket.handlers.room_joined({ roomConfig: { isGuest: false } });
    await vi.advanceTimersByTimeAsync(60_000);

    expect(socket.emit).toHaveBeenCalledTimes(2);
    expect(h.accountUnverified).toHaveBeenCalledTimes(1);
  });

  it("session expirée, pas de jeton : le dit tout de suite, aucun essai", async () => {
    const h = page();
    await joinRoom(h, joinPayload(session({ getToken: async () => null })));
    await vi.advanceTimersByTimeAsync(0);
    socket.handlers.room_joined({ roomConfig: { isGuest: true } });
    await vi.advanceTimersByTimeAsync(60_000);

    expect(socket.emit).toHaveBeenCalledTimes(1);
    expect(h.accountUnverified.mock.calls[0][0]).toContain("session a expiré");
  });

  it("invité volontaire : ni message ni essai", async () => {
    const h = page();
    await joinRoom(h, joinPayload(session({ isGuest: true, userId: null })));
    await vi.advanceTimersByTimeAsync(0);
    socket.handlers.room_joined({ roomConfig: { isGuest: true } });
    await vi.advanceTimersByTimeAsync(60_000);

    expect(socket.emit).toHaveBeenCalledTimes(1);
    expect(envois()[0]).toMatchObject({ isGuest: true, token: null });
    expect(h.accountUnverified).not.toHaveBeenCalled();
  });

  it("déconnecté pendant l'attente : pas d'essai", async () => {
    await joinRoom(page(), joinPayload(session()));
    await vi.advanceTimersByTimeAsync(0);
    socket.handlers.room_joined({ roomConfig: { isGuest: true } });
    socket.connected = false;
    await vi.advanceTimersByTimeAsync(10_000);

    expect(socket.emit).toHaveBeenCalledTimes(1);
  });
});

describe("sortie imposée", () => {
  for (const evt of ["admin_kicked", "room_force_closed"])
    it(`${evt} : coupe, renvoie vers les rooms, ne rejoint plus`, async () => {
      const kicked = vi.fn();
      await joinRoom(page({ kicked }), joinPayload(session()));
      await attendEnvois(1);
      socket.handlers.connect();
      socket.handlers[evt]({});
      expect(socket.disconnect).toHaveBeenCalled();
      expect(kicked).toHaveBeenCalledTimes(1);

      socket.handlers.connect();
      await new Promise((r) => setTimeout(r, 10));
      expect(socket.emit).toHaveBeenCalledTimes(1);
    });
});

describe("room inconnue", () => {
  it("le dit, puis renvoie vers les rooms", async () => {
    vi.useFakeTimers();
    try {
      const kicked = vi.fn();
      const serverError = vi.fn();
      await joinRoom(page({ kicked, serverError }), joinPayload(session()));
      socket.handlers.room_unknown();
      expect(serverError.mock.calls[0][0]).toContain("n’existe pas");
      expect(kicked).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(3000);
      expect(kicked).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("la page s'aligne sur ce que le serveur a retenu", () => {
  const rejoint = (g, config) => gameHandlers(g).roomJoined(config);

  it("pseudo attribué et statut d'invité", () => {
    const g = session({ canInviteFriends: true });
    rejoint(g, { username: "alice 2", isGuest: true });
    expect(g).toMatchObject({
      username: "alice 2",
      isGuest: true,
      canInviteFriends: false,
    });

    rejoint(g, { username: "alice 2", isGuest: false });
    expect(g).toMatchObject({ isGuest: false, canInviteFriends: true });
  });

  it("le message s'affiche puis s'efface", () => {
    let efface;
    const g = session({ later: (_, __, fn) => (efface = fn) });
    gameHandlers(g).accountUnverified("message");
    expect(g.errorMsg).toBe("message");
    efface();
    expect(g.errorMsg).toBe("");
  });
});
