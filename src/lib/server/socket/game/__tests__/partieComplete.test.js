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

// Une vraie partie de room : vrai serveur Socket.io, vrais clients, vrai code.
// Seuls la base, YouTube et les extraits sont simulés.
const db = vi.hoisted(() => ({
  room: null,
  inserts: {},
  rpc: [],
  exec: vi.fn(),
  preview: vi.fn(),
  resultat: vi.fn(async () => "resultat"),
}));

vi.mock("child_process", async (original) => ({
  ...(await original()),
  execFile: db.exec,
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
  saveGameResult: db.resultat,
}));
vi.mock("../../../services/weeklyChallenge.js", () => ({
  bumpWeeklyChallenge: () => {},
}));

const { partie, pause } = await import("./partieHarness.js");

const SECRETS =
  /Papillonnage|Hippopotamus|Kaleidoscope|Xylophonie|Zorglub|dzcdn/i;
const h = partie(db);
const { ouvrir, joueur, room, titreEnCours, repondre, caler, lignes, stats } =
  h;

beforeAll(() => h.start());
beforeEach(() => {
  h.reset();
  db.resultat.mockClear();
});
afterEach(() => h.nettoyer());
afterAll(() => h.stop());

describe("une partie complète de room", () => {
  it("lancement par le créateur, deux manches, résultats enregistrés, revanche", async () => {
    ouvrir({ max_rounds: 2, round_duration: 2 });
    const alice = await joueur("alice");
    const bob = await joueur("bob");
    const carole = await joueur("carole", null);

    bob.socket.emit("request_new_game");
    await bob.attend("server_error");
    expect(room().game.inProgress).toBeFalsy();

    alice.socket.emit("request_new_game");
    const manche = await carole.attend("start_round");
    expect(manche).toMatchObject({ round: 1, total: 2 });
    expect(manche.audioUrl).toBeTruthy();

    // Avant le départ synchronisé, une réponse n'est pas comptée
    await alice.attend("start_round");
    alice.socket.emit("submit_guess", titreEnCours().title);
    await pause(30);
    expect(alice.de("feedback")).toEqual([]);

    // Départ à 75 % de joueurs prêts : 2 sur 3
    alice.socket.emit("player_ready");
    await pause(30);
    expect(carole.de("round_start_sync")).toEqual([]);
    bob.socket.emit("player_ready");
    await carole.attend("round_start_sync");

    repondre(alice);
    await alice.attend("feedback", 2);
    expect(alice.de("feedback").map((f) => f.type)).toEqual([
      "success_title",
      "success_artist",
    ]);
    bob.socket.emit("submit_guess", "qqqqqqqqqqqq");
    expect((await bob.attend("feedback")).type).toBe("miss");

    const titre1 = titreEnCours().title;
    const fin = await carole.attend("round_end");
    expect(fin.reason).toBe("Temps écoulé !");
    expect(fin.foundTitle).toBe(false);
    expect(fin.answer).toContain(titre1);
    expect((await alice.attend("round_end")).foundTitle).toBe(true);
    expect(carole.de("timer_update").length).toBeGreaterThan(0);

    // Celui qui n'a rien trouvé n'a rien appris avant la révélation
    const avant = carole.recus.slice(
      0,
      carole.recus.findIndex((r) => r.event === "round_end"),
    );
    expect(JSON.stringify(avant)).not.toMatch(SECRETS);

    await caler(2, alice, bob, carole);
    for (const j of [alice, bob, carole]) repondre(j);

    const podium = await carole.attend("game_over");
    expect((await alice.attend("round_end", 2)).reason).toBe(
      "Tout le monde a trouvé !",
    );
    expect(podium.map((p) => p.score)).toEqual(
      podium.map((p) => p.score).sort((a, b) => b - a),
    );
    expect(podium[0].name).toBe("alice");
    expect(podium.every((p) => p.score > 0)).toBe(true);

    // En base : chaque joueur une fois, l'invité sans statistiques
    await alice.attend("game_result_id");
    expect(
      lignes()
        .map((l) => [l.username, l.is_guest])
        .sort(),
    ).toEqual([
      ["alice", false],
      ["bob", false],
      ["carole", true],
    ]);
    expect(lignes().find((l) => l.username === "alice").rank).toBe(1);
    for (const l of lignes())
      expect(l.score).toBe(podium.find((p) => p.name === l.username).score);
    expect(
      stats()
        .map((s) => s.args.p_user_id)
        .sort(),
    ).toEqual(["u-alice", "u-bob"]);
    expect(db.resultat).toHaveBeenCalledTimes(2);
    expect(db.exec).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();

    alice.socket.emit("request_new_game");
    await carole.attend("start_round", 3);
    expect(room().players.alice.score).toBe(0);
    expect(db.inserts.games).toHaveLength(2);
  }, 20000);

  it("coupure puis retour pendant la manche : score gardé, reprise au bon endroit", async () => {
    ouvrir();
    const alice = await joueur("alice");
    const bob = await joueur("bob");
    alice.socket.emit("request_new_game");
    await caler(1, alice, bob);
    repondre(alice);
    await alice.attend("feedback", 2);
    const score = room().players.alice.score;
    expect(score).toBeGreaterThan(0);

    alice.socket.disconnect();
    await pause(30);
    const retour = await joueur("alice");
    await retour.attend("start_round");
    expect((await retour.attend("round_start_sync")).elapsed).toBeGreaterThan(
      0,
    );
    expect(room().players.alice.score).toBe(score);

    // Une réponse déjà trouvée ne rapporte pas une seconde fois
    repondre(retour);
    await pause(30);
    expect(room().players.alice.score).toBe(score);

    repondre(bob);
    const podium = await bob.attend("game_over");
    expect(podium.find((p) => p.name === "alice").score).toBe(score);
    await vi.waitFor(() => expect(lignes()).toHaveLength(2));
  }, 20000);

  it("parti puis revenu dans la même manche : points gardés, rien de compté deux fois", async () => {
    ouvrir();
    const alice = await joueur("alice");
    const bob = await joueur("bob");
    alice.socket.emit("request_new_game");
    await caler(1, alice, bob);
    repondre(bob);
    await bob.attend("feedback", 2);
    const score = room().players.bob.score;
    expect(score).toBeGreaterThan(0);

    bob.socket.disconnect();
    await vi.waitFor(() => expect(room().players.bob).toBeUndefined(), {
      timeout: 6000,
    });
    // Rien en base tant que la partie continue : il peut revenir
    expect(lignes()).toEqual([]);
    await vi.waitFor(() =>
      expect(
        alice
          .de("update_players")
          .at(-1)
          .map((p) => p.name),
      ).toEqual(["alice"]),
    );

    // Même manche : ses réponses restent acquises, il ne remarque pas deux fois
    const retour = await joueur("bob");
    expect(room().players.bob.score).toBe(score);
    repondre(alice);
    repondre(retour);
    const podium = await alice.attend("game_over");
    await alice.attend("game_result_id");
    expect(podium.find((p) => p.name === "bob")).toMatchObject({
      score,
      left: false,
    });
    expect(lignes().filter((l) => l.username === "bob")).toMatchObject([
      { score },
    ]);
    expect(stats()).toHaveLength(2);
  }, 20000);

  it("dernier joueur parti : partie arrêtée et room libérée", async () => {
    ouvrir({ max_rounds: 2 });
    const alice = await joueur("alice");
    alice.socket.emit("request_new_game");
    await caler(1, alice);
    const { game } = room();

    alice.socket.disconnect();
    await vi.waitFor(() => expect(room()).toBeUndefined(), { timeout: 6000 });
    expect(game.interval).toBeNull();
    expect(game.isActive).toBe(false);
  }, 20000);

  it("QCM : choix sans la bonne réponse, une seule réponse, pas de statistiques", async () => {
    ouvrir({ game_mode: "qcm" });
    const alice = await joueur("alice");
    const bob = await joueur("bob");
    alice.socket.emit("request_new_game");
    await caler(1, alice, bob);
    const manche = bob.de("start_round")[0];
    expect(manche.choices.length).toBeGreaterThan(1);
    expect(manche.correctChoiceIndex).toBeUndefined();

    const juste = room().game.correctChoiceIndex;
    const faux = (juste + 1) % manche.choices.length;
    alice.socket.emit("submit_choice", { choiceIndex: juste });
    alice.socket.emit("submit_choice", { choiceIndex: faux });
    expect((await alice.attend("choice_result")).correct).toBe(true);
    await pause(30);
    expect(alice.de("choice_result")).toHaveLength(1);
    bob.socket.emit("submit_choice", { choiceIndex: faux });

    expect((await bob.attend("round_end")).correctChoiceIndex).toBe(juste);
    const podium = await bob.attend("game_over");
    expect(podium[0].name).toBe("alice");
    expect(podium[1].score).toBe(0);
    await vi.waitFor(() => expect(lignes()).toHaveLength(2));
    expect(stats()).toEqual([]);
  }, 20000);
});
