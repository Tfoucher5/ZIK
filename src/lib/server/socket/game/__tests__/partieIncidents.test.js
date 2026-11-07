import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
} from "vitest";

// Ce qui peut mal tourner pendant une partie de room, sur un vrai serveur Socket.io
const db = vi.hoisted(() => ({
  room: null,
  inserts: {},
  rpc: [],
  exec: vi.fn(),
  preview: vi.fn(),
  signale: vi.fn(),
}));

vi.mock("child_process", async (original) => ({
  ...(await original()),
  execFile: db.exec,
}));
vi.mock("../config.js", async (original) => ({
  ...(await original()),
  AUTO_START_DELAY: 0.05,
}));
vi.mock("../../../config.js", async () =>
  (await import("./partieDb.js")).fauxConfig(db),
);
vi.mock("../../../services/music/deezer.js", () => ({
  fetchDeezerTrackPreview: db.preview,
  deezerPreviewMatch: async () => null,
  iTunesPreviewMatch: async () => null,
  iTunesPreviewSearch: async () => null,
  parseExpFromUrl: () => null,
}));
vi.mock("../../../services/music/trackIssues.js", () => ({
  reportTrackIssue: db.signale,
}));
vi.mock("../../../services/achievements.js", () => ({
  checkAchievements: async () => [],
  saveGameResult: async () => null,
}));
vi.mock("../../../services/weeklyChallenge.js", () => ({
  bumpWeeklyChallenge: () => {},
}));

const { partie, pause, extrait } = await import("./partieHarness.js");

const h = partie(db);
const { ouvrir, joueur, client, room, titreEnCours, repondre, caler } = h;

beforeAll(() => h.start());
beforeEach(() => {
  h.reset();
  db.signale.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(async () => {
  await h.nettoyer();
  vi.spyOn(Math, "random").mockRestore();
  vi.spyOn(console, "error").mockRestore();
});
afterAll(() => h.stop());

describe("incidents pendant une partie de room", () => {
  it("room automatique : le premier arrivé lance le décompte, la partie démarre seule", async () => {
    ouvrir({ auto_start: true, owner_id: null });
    const alice = await joueur("alice");
    await alice.attend("game_countdown");
    expect((await alice.attend("start_round")).round).toBe(1);
  }, 20000);

  it("titre sans extrait : un titre de réserve prend sa place", async () => {
    // Ordre de tirage figé : les titres 2, 1, 0 sortent dans cet ordre, le 3 en réserve
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    db.preview.mockImplementation(async (id) =>
      id === "100" ? null : extrait(id),
    );
    ouvrir({ max_rounds: 3 });
    const alice = await joueur("alice");
    alice.socket.emit("request_new_game");

    for (const n of [1, 2, 3]) {
      await caler(n, alice);
      if (n === 3) expect(titreEnCours().id).toBe("titre3");
      // Manches enchaînées en quelques ms : la limite de 4 réponses/s bloquerait
      room().players.alice._guessTimes = [];
      repondre(alice);
      await alice.attend("round_end", n);
    }
    await alice.attend("game_over");
    expect(db.signale).toHaveBeenCalledTimes(1);
    expect(db.signale.mock.calls[0][0]).toBe("titre0");
  }, 20000);

  it("Deezer et iTunes en panne : la partie se termine au lieu de boucler", async () => {
    db.preview.mockResolvedValue(null);
    ouvrir({ max_rounds: 2 });
    const alice = await joueur("alice");
    alice.socket.emit("request_new_game");

    await alice.attend("game_over");
    expect(alice.de("start_round")).toEqual([]);
    expect(db.exec).not.toHaveBeenCalled();
  }, 20000);

  it("messages mal formés et rafale de réponses en pleine manche : la partie continue", async () => {
    ouvrir();
    const alice = await joueur("alice");
    alice.socket.emit("request_new_game");
    await caler(1, alice);

    const intrus = client();
    for (const payload of [undefined, null, 42, [], {}, { guess: 42 }, "x"]) {
      // Un texte est une réponse valide : il consommerait la limite de débit
      if (typeof payload !== "string")
        alice.socket.emit("submit_guess", payload);
      alice.socket.emit("join_room", payload);
      alice.socket.emit("submit_choice", payload);
      intrus.socket.emit("submit_guess", payload);
      intrus.socket.emit("player_ready", payload);
      intrus.socket.emit("send_chat", payload);
      intrus.socket.emit("request_new_game", payload);
    }
    alice.socket.emit("submit_guess", "x".repeat(100_000));
    for (const roomId of ["__proto__", "constructor"])
      intrus.socket.emit("join_room", { roomId, username: "pirate" });
    for (const username of ["__proto__", "constructor", "   "])
      intrus.socket.emit("join_room", { roomId: h.code, username });
    await pause(50);
    expect(Object.keys(room().players)).toEqual(["alice"]);
    expect(intrus.de("room_joined")).toEqual([]);
    // safe() avale les exceptions : sans ce contrôle, un plantage passerait inaperçu
    expect(console.error).not.toHaveBeenCalled();

    // Au plus 4 réponses par seconde sont prises en compte
    const avant = alice.de("feedback").length;
    for (let i = 0; i < 20; i++)
      alice.socket.emit("submit_guess", "qqqqqqqqqqqq");
    await pause(50);
    expect(alice.de("feedback").length - avant).toBe(4);

    await pause(1100);
    repondre(alice);
    const podium = await alice.attend("game_over");
    expect(podium[0].score).toBeGreaterThan(0);
  }, 20000);
});
