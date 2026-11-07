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

// Qui est qui dans une room : ni le userId ni le pseudo envoyés ne font foi
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
const { ouvrir, joueur, client, room, repondre, caler, lignes, stats } = h;

// Se présente sous l'identité qu'on veut, avec ou sans preuve
async function entre(identite) {
  const c = client();
  c.socket.emit("join_room", { roomId: h.code, ...identite });
  c.config = (await c.attend("room_joined")).roomConfig;
  return c;
}

beforeAll(() => h.start());
beforeEach(() => {
  h.reset();
  db.profil = null;
});
afterEach(() => h.nettoyer());
afterAll(() => h.stop());

describe("identité dans une room", () => {
  for (const [cas, token] of [
    ["sans jeton", undefined],
    ["avec un jeton invalide", "faux"],
    ["avec le jeton d'un autre compte", "jeton:u-pirate"],
  ])
    it(`compte annoncé ${cas} : joue en invité, ne touche pas au compte`, async () => {
      ouvrir({ owner_id: "u-alice" });
      const alice = await joueur("alice");
      const pirate = await entre({
        username: "pirate",
        userId: "u-alice",
        isGuest: false,
        token,
      });

      expect(pirate.config).toMatchObject({ isGuest: true, isAdmin: false });
      expect(room().players.pirate).toMatchObject({
        userId: null,
        isGuest: true,
      });

      pirate.socket.emit("request_new_game");
      await pirate.attend("server_error");
      expect(room().game.inProgress).toBeFalsy();

      alice.socket.emit("request_new_game");
      await caler(1, alice, pirate);
      repondre(pirate);
      repondre(alice);
      await alice.attend("game_over");
      await vi.waitFor(() => expect(lignes()).toHaveLength(2));
      await vi.waitFor(() => expect(stats()).toHaveLength(1));
      expect(stats()[0].args.p_score).toBe(room().players.alice.score);
      expect(lignes().find((l) => l.username === "pirate")).toMatchObject({
        user_id: null,
        is_guest: true,
      });
    }, 20000);

  it("une reprise de session sans preuve ne déloge pas le vrai joueur", async () => {
    ouvrir();
    const alice = await joueur("alice");
    const pirate = await entre({
      username: "pirate",
      userId: "u-alice",
      isGuest: false,
      takeover: true,
    });

    expect(pirate.config.isGuest).toBe(true);
    await pause(30);
    expect(alice.de("session_taken_over")).toEqual([]);
    expect(alice.socket.connected).toBe(true);
    expect(room().players.alice.userId).toBe("u-alice");
  });

  it("le vrai compte est reconnu et joue sous le pseudo de son profil", async () => {
    ouvrir();
    db.profil = { username: "alice" };
    const c = await entre({
      username: "usurpe",
      userId: "u-alice",
      isGuest: false,
      token: "jeton:u-alice",
    });

    expect(c.config).toMatchObject({
      username: "alice",
      isGuest: false,
      isAdmin: true,
    });
    expect(Object.keys(room().players)).toEqual(["alice"]);
  });

  it("le pseudo d'un joueur présent ne donne pas sa place : ni score ni compte", async () => {
    ouvrir();
    const alice = await joueur("alice");
    room().players.alice.score = 12;

    const invite = await entre({ username: "alice" });
    expect(invite.config).toMatchObject({
      username: "alice 2",
      isGuest: true,
      isAdmin: false,
    });
    expect(room().players.alice).toMatchObject({
      score: 12,
      userId: "u-alice",
    });
    expect(room().socketToName[alice.socket.id]).toBe("alice");

    alice.socket.disconnect();
    await pause(30);
    const recharge = await entre({ username: "alice" });
    expect(recharge.config.username).toBe("alice 3");
    expect(room().players.alice.score).toBe(12);
  });

  it("deux invités au même pseudo jouent chacun de leur côté", async () => {
    ouvrir();
    const a = await entre({ username: "Joueur" });
    const b = await entre({ username: "Joueur" });

    expect(b.config.username).toBe("Joueur 2");
    expect(room().socketToName[a.socket.id]).toBe("Joueur");
    expect(room().socketToName[b.socket.id]).toBe("Joueur 2");
  });

  it("invité : même place après une page rechargée ou une coupure pas encore vue", async () => {
    ouvrir();
    const a = await entre({ username: "bob" });
    room().players.bob.score = 7;

    a.socket.disconnect();
    await pause(30);
    const recharge = await entre({ username: "bob" });
    expect(recharge.config.username).toBe("bob");

    // L'ancien socket est encore vu comme connecté : l'id précédent fait foi
    const reconnecte = await entre({
      username: "bob",
      prevSid: recharge.socket.id,
    });
    expect(reconnecte.config.username).toBe("bob");
    expect(room().players.bob.score).toBe(7);

    const pirate = await entre({ username: "bob", prevSid: "devine" });
    expect(pirate.config.username).toBe("bob 2");
    expect(room().players.bob.score).toBe(7);
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
