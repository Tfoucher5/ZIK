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

// Le score d'un joueur parti ne vit qu'en mémoire jusqu'à la fin de partie :
// aucune sortie de la room ne doit le perdre
const db = vi.hoisted(() => ({
  room: null,
  inserts: {},
  rpc: [],
  preview: vi.fn(),
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
vi.mock("../../../services/achievements.js", () => ({
  checkAchievements: async () => [],
  saveGameResult: async () => null,
}));
vi.mock("../../../services/weeklyChallenge.js", () => ({
  bumpWeeklyChallenge: () => {},
}));

const { adminCloseRoom, adminKickPlayer } = await import("../index.js");
const { saveAllDeparted } = await import("../results.js");
const { partie } = await import("./partieHarness.js");

const h = partie(db);
const { ouvrir, joueur, room, repondre, caler, lignes, stats } = h;

async function partieAvecParti() {
  ouvrir({ max_rounds: 2 });
  const alice = await joueur("alice");
  alice.socket.emit("request_new_game");
  await caler(1, alice);
  room().game.pendingGrants.bob = ["carte"];
  room().game.departed.bob = {
    name: "bob",
    userId: "u-bob",
    isGuest: false,
    score: 4,
    roundsPresent: 0,
  };
  return alice;
}

const cartes = () => db.rpc.filter((r) => r.fn === "card_settle");
const ligneBob = () =>
  vi.waitFor(() =>
    expect(lignes()).toMatchObject([
      { username: "bob", score: 4, rank: null, user_id: "u-bob" },
    ]),
  );

beforeAll(() => h.start());
beforeEach(() => h.reset());
afterEach(() => h.nettoyer());
afterAll(() => h.stop());

describe("score d'un joueur parti", () => {
  it("fermeture de la room par l'admin : écrit en base, cartes réglées", async () => {
    await partieAvecParti();
    const game = room().game;

    expect(adminCloseRoom(h.code)).toBe(true);

    await ligneBob();
    await vi.waitFor(() => expect(stats()).toHaveLength(1));
    expect(cartes()).toMatchObject([{ args: { p_keep: false } }]);
    expect(game.interval).toBeNull();
  });

  it("redémarrage du serveur : écrit en base, attendu avant de quitter", async () => {
    const alice = await partieAvecParti();

    await saveAllDeparted();

    expect(lignes()).toMatchObject([{ username: "bob", score: 4, rank: null }]);
    expect(stats()).toHaveLength(1);
    expect(room().game.departed).toEqual({});

    // La partie reprise ensuite ne le réécrit pas
    repondre(alice);
    await alice.attend("round_end");
    expect(lignes().filter((l) => l.username === "bob")).toHaveLength(1);
  });

  it("présent à la moitié des manches : ses cartes restent acquises", async () => {
    await partieAvecParti();
    room().game.departed.bob.roundsPresent = 1;

    await saveAllDeparted();

    expect(cartes()).toMatchObject([{ args: { p_keep: true } }]);
  });

  it("revenu avant la fin : ses cartes provisoires ne sont pas réglées au départ", async () => {
    ouvrir({ max_rounds: 2 });
    const alice = await joueur("alice");
    const bob = await joueur("bob");
    alice.socket.emit("request_new_game");
    await caler(1, alice, bob);
    repondre(bob);
    await bob.attend("feedback", 2);
    room().game.pendingGrants.bob = ["carte"];

    bob.socket.disconnect();
    await vi.waitFor(() => expect(room().players.bob).toBeUndefined(), {
      timeout: 6000,
    });
    expect(cartes()).toEqual([]);

    await joueur("bob");
    expect(room().game.pendingGrants.bob).toEqual(["carte"]);
  }, 20000);

  it("expulsé pendant le délai de grâce : pas de plantage, la room suit son cours", async () => {
    const erreurs = [];
    const capte = (e) => erreurs.push(e);
    process.on("uncaughtException", capte);
    try {
      ouvrir({ max_rounds: 2 });
      const alice = await joueur("alice");
      const bob = await joueur("bob");
      alice.socket.emit("request_new_game");
      await caler(1, alice, bob);
      repondre(bob);
      await bob.attend("feedback", 2);
      repondre(alice);
      await alice.attend("feedback", 2);

      bob.socket.disconnect();
      await vi.waitFor(() => expect(room().players.bob._dcTimer).toBeDefined());
      adminKickPlayer(h.code, "bob");
      await vi.waitFor(() => expect(lignes()).toHaveLength(1), {
        timeout: 6000,
      });

      expect(erreurs).toEqual([]);
      expect(room().game.departed.bob).toBeUndefined();
    } finally {
      process.off("uncaughtException", capte);
    }
  }, 20000);
});
