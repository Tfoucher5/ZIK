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

// Revenir dans une room : on retrouve sa place, ses points et son compte
const db = vi.hoisted(() => ({
  room: null,
  profil: null,
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

const { partie, pause } = await import("./partieHarness.js");

const h = partie(db);
const { ouvrir, joueur, client, room, caler } = h;

async function entre(identite) {
  const c = client();
  c.socket.emit("join_room", { roomId: h.code, ...identite });
  c.config = (await c.attend("room_joined")).roomConfig;
  return c;
}

const compte = (nom) => ({
  username: nom,
  userId: `u-${nom}`,
  isGuest: false,
  token: `jeton:u-${nom}`,
});

beforeAll(() => h.start());
beforeEach(() => {
  h.reset();
  db.profil = null;
  db.attenteAuth = null;
});
afterEach(() => h.nettoyer());
afterAll(() => h.stop());

describe("retour dans une room", () => {
  it("compte renommé car un invité avait son pseudo : retrouve sa place", async () => {
    ouvrir();
    db.profil = { username: "alice" };
    await entre({ username: "alice" });
    const a = await entre(compte("alice"));
    expect(a.config.username).toBe("alice 2");
    room().players["alice 2"].score = 9;

    const retour = await entre({ ...compte("alice"), prevSid: a.socket.id });
    expect(retour.config.username).toBe("alice 2");
    expect(retour.de("join_refused")).toEqual([]);
    expect(room().players["alice 2"].score).toBe(9);
  });

  it("compte renommé, invité homonyme parti : pas de seconde place à zéro", async () => {
    ouvrir();
    db.profil = { username: "alice" };
    await entre({ username: "alice" });
    const a = await entre(compte("alice"));
    room().players["alice 2"].score = 9;
    delete room().players.alice;

    const retour = await entre({ ...compte("alice"), prevSid: a.socket.id });
    expect(retour.config.username).toBe("alice 2");
    expect(Object.keys(room().players)).toEqual(["alice 2"]);
    expect(room().players["alice 2"].score).toBe(9);
  });

  for (const [cas, coupureVue] of [
    ["coupure pas encore vue", false],
    ["coupure déjà vue", true],
  ])
    it(`vérification ratée puis réussie (${cas}) : le compte retrouve place et points`, async () => {
      ouvrir();
      const a = await entre({ ...compte("bob"), token: undefined });
      expect(a.config.isGuest).toBe(true);
      room().players.bob.score = 5;
      const prevSid = a.socket.id;
      if (coupureVue) {
        a.socket.disconnect();
        await pause(30);
      }

      const retour = await entre({ ...compte("bob"), prevSid });
      expect(retour.config).toMatchObject({ username: "bob", isGuest: false });
      expect(room().players.bob).toMatchObject({
        score: 5,
        userId: "u-bob",
        isGuest: false,
      });
    });

  it("vérification ratée, profil sous un autre pseudo : une seule place, points gardés", async () => {
    ouvrir();
    const a = await entre({ ...compte("bob"), token: undefined });
    room().players.bob.score = 5;
    db.profil = { username: "robert" };

    await entre({ ...compte("bob"), prevSid: a.socket.id });
    expect(Object.keys(room().players)).toEqual(["bob"]);
    expect(room().players.bob).toMatchObject({ score: 5, userId: "u-bob" });
  });

  it("nouvelle vérification sur le même socket : la manche en cours n'est pas rejouée", async () => {
    ouvrir();
    const alice = await joueur("alice");
    const bob = await entre({ ...compte("bob"), token: undefined });
    alice.socket.emit("request_new_game");
    await caler(1, alice, bob);

    bob.socket.emit("join_room", { roomId: h.code, ...compte("bob") });
    const { roomConfig } = await bob.attend("room_joined", 2);
    expect(roomConfig.isGuest).toBe(false);
    await pause(30);
    expect(bob.de("start_round")).toHaveLength(1);
    expect(bob.de("round_start_sync")).toHaveLength(1);
  });

  it("nouvel onglet sans preuve, compte déjà actif : pas de seconde place", async () => {
    ouvrir();
    db.profil = { username: "alice" };
    await entre({ username: "alice" });
    await entre(compte("alice"));

    const onglet = client();
    onglet.socket.emit("join_room", { roomId: h.code, ...compte("alice") });
    await onglet.attend("join_refused");
    expect(Object.keys(room().players)).toEqual(["alice", "alice 2"]);
  });

  it("retour pendant une panne d'authentification : compte et droits aux cartes gardés", async () => {
    ouvrir();
    const a = await entre(compte("alice"));
    await vi.waitFor(() => expect(room().players.alice.verified).toBe(true));

    const retour = await entre({
      ...compte("alice"),
      token: "faux",
      prevSid: a.socket.id,
    });
    await pause(30);
    expect(retour.config).toMatchObject({ username: "alice", isGuest: false });
    expect(room().players.alice).toMatchObject({
      userId: "u-alice",
      verified: true,
    });
  });

  it("parti pendant la vérification du jeton : aucune place fantôme", async () => {
    ouvrir();
    db.attenteAuth = () => pause(80);
    const c = client();
    await new Promise((r) => c.socket.once("connect", r));
    c.socket.emit("join_room", { roomId: h.code, ...compte("fantome") });
    await pause(20);
    c.socket.disconnect();
    await pause(120);
    expect(room()?.players.fantome).toBeUndefined();
  });

  it("authentification muette : le joueur entre en invité sans attendre indéfiniment", async () => {
    ouvrir();
    db.attenteAuth = () => new Promise(() => {});
    const c = await entre({ ...compte("lent"), userId: "u-muet" });
    expect(c.config).toMatchObject({ username: "lent", isGuest: true });
  });

  it("le même socket qui renvoie join_room garde sa place", async () => {
    ouvrir();
    const a = await entre({ username: "bob" });
    a.socket.emit("join_room", { roomId: h.code, username: "bob" });
    await a.attend("room_joined", 2);

    expect(a.de("room_joined")[1].roomConfig.username).toBe("bob");
    expect(Object.keys(room().players)).toEqual(["bob"]);
  });
});
