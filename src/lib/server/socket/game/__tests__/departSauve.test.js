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
  parseExpFromUrl: () => null,
}));
vi.mock("../../../services/achievements.js", () => ({
  checkAchievements: async () => [],
  saveGameResult: async () => null,
}));
vi.mock("../../../services/weeklyChallenge.js", () => ({
  bumpWeeklyChallenge: () => {},
}));

const { adminCloseRoom, adminEndGame, adminKickPlayer, adminPauseRoom } =
  await import("../index.js");
const { saveAllPlayers } = await import("../results.js");
const { partie, pause } = await import("./partieHarness.js");

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

    await saveAllPlayers();

    expect(lignes()).toMatchObject([{ username: "bob", score: 4, rank: null }]);
    expect(stats()).toHaveLength(1);
    expect(room().game.departed).toEqual({});
    expect(db.ecrituresAnon).toEqual([]);

    // La partie reprise ensuite ne le réécrit pas
    repondre(alice);
    await alice.attend("round_end");
    expect(lignes().filter((l) => l.username === "bob")).toHaveLength(1);
  });

  for (const [cas, sortir] of [
    ["redémarrage", () => saveAllPlayers()],
    ["fermeture par l'admin", () => adminCloseRoom(h.code)],
  ])
    it(`${cas} : les joueurs encore connectés gardent aussi leur score`, async () => {
      await partieAvecParti();
      room().players.alice.score = 6;

      await sortir();

      await vi.waitFor(() =>
        expect(lignes().map((l) => [l.username, l.score])).toEqual([
          ["bob", 4],
          ["alice", 6],
        ]),
      );
    });

  it("partie déjà finie : un redémarrage ne réécrit rien", async () => {
    ouvrir();
    const alice = await joueur("alice");
    alice.socket.emit("request_new_game");
    await caler(1, alice);
    repondre(alice);
    await alice.attend("game_over");
    await vi.waitFor(() => expect(lignes()).toHaveLength(1));

    await saveAllPlayers();
    expect(lignes()).toHaveLength(1);
  });

  it("l'admin termine deux fois : le classement à l'écran ne change pas", async () => {
    const alice = await partieAvecParti();
    await adminEndGame(h.code);
    await adminEndGame(h.code);
    await pause(30);

    expect(alice.de("game_over")).toHaveLength(1);
    expect(alice.de("game_over")[0].map((p) => p.name)).toContain("bob");
  });

  it("revanche, insert en panne : pas de score sur la ligne d'avant, « Terminer » fonctionne", async () => {
    ouvrir();
    const alice = await joueur("alice");
    alice.socket.emit("request_new_game");
    await caler(1, alice);
    repondre(alice);
    await alice.attend("game_over");
    await vi.waitFor(() => expect(lignes()).toHaveLength(1));

    db.insertGameKo = true;
    alice.socket.emit("request_new_game");
    await alice.attend("start_round", 2);
    db.insertGameKo = false;
    expect(room().game.dbGameId).toBeNull();

    await adminEndGame(h.code);
    await alice.attend("game_over", 2);
    expect(lignes()).toHaveLength(1);
  });

  it("expulsé alors que connecté : ses cartes provisoires sont perdues", async () => {
    await partieAvecParti();
    room().game.pendingGrants.alice = ["carte"];

    adminKickPlayer(h.code, "alice");

    await vi.waitFor(() =>
      expect(cartes()).toMatchObject([
        { args: { p_user_id: "u-alice", p_keep: false } },
      ]),
    );
  });

  it("présent à la moitié des manches : ses cartes restent acquises", async () => {
    await partieAvecParti();
    room().game.departed.bob.roundsPresent = 1;

    await saveAllPlayers();

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

  it("expulsé pendant le délai de grâce puis revenu : ancien score écrit, nouvelle place intacte", async () => {
    ouvrir({ max_rounds: 1 });
    const alice = await joueur("alice");
    const bob = await joueur("bob");
    alice.socket.emit("request_new_game");
    await caler(1, alice, bob);
    repondre(bob);
    await bob.attend("feedback", 2);
    const ancien = room().players.bob.score;

    bob.socket.disconnect();
    await vi.waitFor(() => expect(room().players.bob._dcTimer).toBeDefined());
    adminKickPlayer(h.code, "bob");
    const retour = await joueur("bob");
    await vi.waitFor(() => expect(lignes()).toHaveLength(1), { timeout: 6000 });

    expect(lignes()[0]).toMatchObject({ username: "bob", score: ancien });
    expect(room().players.bob).toMatchObject({ score: 0 });
    expect(room().socketToName[retour.socket.id]).toBe("bob");
    expect(room().game.departed.bob).toBeUndefined();

    // Sa nouvelle place a sa propre ligne en fin de partie
    repondre(alice);
    repondre(retour);
    await retour.attend("game_over");
    await vi.waitFor(() => expect(lignes()).toHaveLength(3));
  }, 20000);

  it("pause admin : un départ ne clôt pas la manche sous l'écran de pause", async () => {
    ouvrir();
    const alice = await joueur("alice");
    const bob = await joueur("bob");
    alice.socket.emit("request_new_game");
    await caler(1, alice, bob);
    repondre(alice);
    await alice.attend("feedback", 2);
    adminPauseRoom(h.code);

    bob.socket.disconnect();
    await vi.waitFor(() => expect(room().players.bob).toBeUndefined(), {
      timeout: 6000,
    });
    await pause(30);
    expect(alice.de("round_end")).toEqual([]);
  }, 20000);

  it("fermeture admin : une room éphémère recréée n'est pas tuée par l'ancien minuteur", async () => {
    await partieAvecParti();
    const ancien = vi.fn();
    room()._emptyTimer = setTimeout(ancien, 30);

    adminCloseRoom(h.code);
    await pause(60);
    expect(ancien).not.toHaveBeenCalled();
  });

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
