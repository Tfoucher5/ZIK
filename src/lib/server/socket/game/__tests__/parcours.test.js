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

// Ce que vit un joueur qui part, revient ou se trompe de porte
const db = vi.hoisted(() => ({
  room: null,
  profil: null,
  inserts: {},
  rpc: [],
  preview: vi.fn(),
  resultat: vi.fn(async () => "resultat"),
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

const { customRooms } = await import("../../../state.js");
const { buildTrack } = await import("../../../services/music/playlist.js");
const { partie, pause } = await import("./partieHarness.js");

const h = partie(db);
const { ouvrir, joueur, client, room, repondre, caler, lignes, stats } = h;
const GRACE = { timeout: 6000 };

async function entre(identite) {
  const c = client();
  c.socket.emit("join_room", { roomId: h.code, ...identite });
  c.config = (await c.attend("room_joined")).roomConfig;
  return c;
}

const parti = (nom) =>
  vi.waitFor(() => expect(room().players[nom]).toBeUndefined(), GRACE);

beforeAll(() => h.start());
beforeEach(() => {
  h.reset();
  db.profil = null;
  db.resultat.mockClear();
});
afterEach(() => h.nettoyer());
afterAll(() => h.stop());

describe("départs et retours", () => {
  it("parti pour de bon : reste au classement final et en base, une seule fois", async () => {
    ouvrir();
    const alice = await joueur("alice");
    const bob = await joueur("bob");
    alice.socket.emit("request_new_game");
    await caler(1, alice, bob);
    repondre(bob);
    await bob.attend("feedback", 2);
    const score = room().players.bob.score;

    bob.socket.disconnect();
    await parti("bob");
    // Présent à moins de la moitié des manches : sa carte provisoire est perdue
    room().game.pendingGrants.bob = ["carte"];
    expect(db.rpc.filter((r) => r.fn === "card_settle")).toEqual([]);
    repondre(alice);

    const podium = await alice.attend("game_over");
    expect(podium.find((p) => p.name === "bob")).toMatchObject({
      score,
      left: true,
    });
    expect(podium.find((p) => p.name === "alice").left).toBe(false);
    await alice.attend("game_result_id");
    expect(lignes().filter((l) => l.username === "bob")).toMatchObject([
      { score, user_id: "u-bob" },
    ]);
    expect(lignes().every((l) => l.rank !== null)).toBe(true);
    expect(stats()).toHaveLength(2);
    expect(db.resultat).toHaveBeenCalledTimes(2);
    expect(db.rpc.filter((r) => r.fn === "card_settle")).toMatchObject([
      { args: { p_user_id: "u-bob", p_keep: false } },
    ]);
  }, 20000);

  it("le dernier joueur attendu part : la manche se clôt sans attendre le chrono", async () => {
    ouvrir();
    const alice = await joueur("alice");
    const bob = await joueur("bob");
    alice.socket.emit("request_new_game");
    await caler(1, alice, bob);
    repondre(alice);
    await alice.attend("feedback", 2);
    expect(alice.de("round_end")).toEqual([]);

    bob.socket.disconnect();
    await vi.waitFor(
      () => expect(alice.de("round_end")).toHaveLength(1),
      GRACE,
    );
  }, 20000);

  it("revenu à une manche suivante : points gardés, peut marquer à nouveau", async () => {
    ouvrir({ max_rounds: 2 });
    const alice = await joueur("alice");
    const bob = await joueur("bob");
    alice.socket.emit("request_new_game");
    await caler(1, alice, bob);
    repondre(bob);
    await bob.attend("feedback", 2);
    const score = room().players.bob.score;

    bob.socket.disconnect();
    await parti("bob");
    repondre(alice);
    await alice.attend("start_round", 2);

    const retour = await joueur("bob");
    expect(room().players.bob).toMatchObject({
      score,
      foundTitle: false,
      foundArtist: false,
    });
    await retour.attend("start_round");
    alice.socket.emit("player_ready");
    retour.socket.emit("player_ready");
    await alice.attend("round_start_sync", 2);
    repondre(retour);
    await retour.attend("feedback", 2);
    expect(room().players.bob.score).toBeGreaterThan(score);
  }, 20000);

  it("invité parti : sans preuve, son nom et ses points restent à lui", async () => {
    ouvrir();
    const alice = await joueur("alice");
    const invite = await entre({ username: "bob" });
    alice.socket.emit("request_new_game");
    await caler(1, alice, invite);
    repondre(invite);
    await invite.attend("feedback", 2);
    const score = room().players.bob.score;
    const prevSid = invite.socket.id;

    invite.socket.disconnect();
    await parti("bob");

    const autre = await entre({ username: "bob" });
    expect(autre.config.username).toBe("bob 2");
    expect(room().players["bob 2"].score).toBe(0);

    const retour = await entre({ username: "bob", prevSid });
    expect(retour.config.username).toBe("bob");
    expect(room().players.bob.score).toBe(score);
  }, 20000);

  it("room vidée pendant la pause, puis retour : une nouvelle partie peut démarrer", async () => {
    ouvrir();
    customRooms[h.code] = {
      id: h.code,
      name: "Éphémère",
      breakDuration: 30,
      maxRounds: 2,
      tracks: ["Papillonnage", "Hippopotamus", "Kaleidoscope"].map((title, i) =>
        buildTrack({ artist: `Zorglub${i}`, title, external_id: `10${i}` }),
      ),
    };
    try {
      const alice = await joueur("alice");
      alice.socket.emit("request_new_game");
      await caler(1, alice);
      repondre(alice);
      await alice.attend("round_end");

      alice.socket.disconnect();
      await parti("alice");
      expect(room().game).toMatchObject({
        inProgress: false,
        breakTimer: null,
      });
      await vi.waitFor(() => expect(lignes()).toMatchObject([{ rank: null }]));

      const retour = await joueur("alice");
      retour.socket.emit("request_new_game");
      expect((await retour.attend("start_round")).round).toBe(1);
    } finally {
      delete customRooms[h.code];
    }
  }, 20000);

  it("second onglet sous le même pseudo : le premier est prévenu et coupé", async () => {
    ouvrir();
    const premier = await joueur("alice");
    await joueur("alice");

    await premier.attend("session_taken_over");
    await vi.waitFor(() => expect(premier.socket.connected).toBe(false));
    expect(Object.keys(room().players)).toEqual(["alice"]);
  });

  it("reconnexion du même client : aucun message de reprise", async () => {
    ouvrir();
    const a = await entre({ username: "bob" });
    await entre({ username: "bob", prevSid: a.socket.id });
    await pause(30);

    expect(a.de("session_taken_over")).toEqual([]);
  });
});

describe("portes d'entrée", () => {
  it("room inconnue : le joueur le voit", async () => {
    ouvrir();
    db.room = null;
    const c = client();
    c.socket.emit("join_room", { roomId: h.code, username: "bob" });
    db.erreurRoom = { code: "PGRST116" };
    c.socket.emit("join_room", { roomId: h.code, username: "bob" });
    await c.attend("room_unknown", 2);
    db.erreurRoom = null;
    expect(c.de("room_joined")).toEqual([]);
  });

  it("base indisponible : le joueur reste sur place, la room n'est pas déclarée inconnue", async () => {
    ouvrir();
    db.room = null;
    db.erreurRoom = { code: "503", message: "indisponible" };
    const c = client();
    c.socket.emit("join_room", { roomId: h.code, username: "bob" });
    expect(await c.attend("server_error")).toContain("Recharge la page");
    db.erreurRoom = null;
    expect(c.de("room_unknown")).toEqual([]);
  });

  it("pseudo vide : le joueur le voit", async () => {
    ouvrir();
    const c = client();
    c.socket.emit("join_room", { roomId: h.code, username: "   " });
    expect(await c.attend("server_error")).toContain("pseudo");
  });

  it("compte renommé : le lien de profil garde le vrai pseudo", async () => {
    ouvrir();
    db.profil = { username: "alice" };
    const invite = await entre({ username: "alice" });
    await entre({
      username: "alice",
      userId: "u-alice",
      isGuest: false,
      token: "jeton:u-alice",
    });

    const moi = await vi.waitFor(() => {
      const p = invite
        .de("update_players")
        .at(-1)
        .find((x) => x.name === "alice 2");
      expect(p).toBeDefined();
      return p;
    });
    expect(moi).toMatchObject({ profile: "alice", isGuest: false });
  });
});
