import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  afterEach,
} from "vitest";

// Une vraie soirée : vrai serveur Socket.io, vrais clients, vrai code du salon.
// Seuls la base, YouTube et les extraits sont simulés.
const db = vi.hoisted(() => ({
  lignes: () => [],
  inserts: {},
  exec: vi.fn(),
}));

vi.mock("child_process", async (original) => ({
  ...(await original()),
  execFile: db.exec,
}));
vi.mock("../../../config.js", () => {
  const query = (table) => {
    const result = () => {
      if (table === "custom_playlist_tracks") return db.lignes();
      return table === "games" ? { id: "partie" } : null;
    };
    const chain = new Proxy(
      {},
      {
        get(_, name) {
          if (name === "then")
            return (resolve) => resolve({ data: result(), error: null });
          if (name === "insert")
            return (rows) => {
              (db.inserts[table] ??= []).push(rows);
              return chain;
            };
          return () => chain;
        },
      },
    );
    return chain;
  };
  const client = {
    from: query,
    rpc: async () => ({ data: null, error: null }),
  };
  return { supabase: client, getAdminClient: () => client };
});
vi.mock("../../../services/music/deezer.js", () => ({
  fetchDeezerTrackPreview: async () => null,
  deezerPreviewMatch: async () => null,
  iTunesPreviewMatch: async () => null,
}));

const { salonRooms } = await import("../../../state.js");
const { departPlayer } = await import("../departed.js");
const { soiree, pause, SECRETS, LIGNES_PLAYLIST } =
  await import("./soireeHarness.js");

db.lignes = () => LIGNES_PLAYLIST;
const h = soiree();
const { ouvrir, joueur, client, repondreJuste, trackEnCours } = h;

beforeAll(async () => {
  await h.start();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("réseau interdit en test");
    }),
  );
});

afterEach(async () => {
  await h.nettoyer();
  db.inserts = {};
});

afterAll(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await h.stop();
});

describe("une soirée complète", () => {
  it("TV, régie et téléphones : deux manches, coupure, retour, départ, podium", async () => {
    const { tv, regie } = await ouvrir();
    const alice = await joueur("alice");
    const bob = await joueur("bob");
    const carole = await joueur("carole");
    const dora = await joueur("dora");

    regie.socket.emit("salon_start");
    const tvManche = await tv.attend("salon_round_start");
    const regieManche = await regie.attend("salon_round_start");
    await alice.attend("salon_round_start");

    // Le média part vers la TV et la régie, la réponse vers la régie seule
    expect(tvManche.videoId).toMatch(/^video\d$/);
    expect(tvManche.hostInfo).toBeUndefined();
    expect(regieManche.hostInfo.title).toBe(trackEnCours().title);

    // Avant que la TV joue, une réponse n'est pas comptée
    alice.socket.emit("salon_submit_guess", { guess: trackEnCours().title });
    await pause(40);
    expect(alice.de("salon_feedback")).toEqual([]);
    await pause(320);

    tv.socket.emit("salon_music_ready");
    await alice.attend("salon_timer_started");

    // Carole coupe pendant la manche, Dora s'en va pour de bon
    carole.socket.disconnect();
    dora.socket.disconnect();
    await pause(40);
    await repondreJuste(alice);
    await pause(320);
    await repondreJuste(bob);

    const fin = await alice.attend("salon_round_end");
    expect(fin.title ?? fin.answer).toBeTruthy();

    // Les téléphones n'ont rien appris avant la révélation
    for (const tel of [alice, bob]) {
      const avant = tel.recus.slice(
        0,
        tel.recus.findIndex((r) => r.event === "salon_round_end"),
      );
      expect(JSON.stringify(avant)).not.toMatch(SECRETS);
    }

    // Départ définitif (délai de grâce écoulé) : le score doit rester compté
    salonRooms[h.code].players.dora.score = 7;
    clearTimeout(salonRooms[h.code].players.dora._dcTimer);
    departPlayer(salonRooms[h.code], "dora");

    // Carole revient avec son jeton et garde sa place
    const retour = await joueur("carole", carole.moi.token);
    expect(retour.moi.username).toBe("carole");

    await tv.attend("salon_round_start", 2);
    tv.socket.emit("salon_music_ready");
    await retour.attend("salon_timer_started");
    await repondreJuste(alice);
    await pause(320);
    await repondreJuste(bob);
    await pause(320);
    await repondreJuste(retour);

    // Plus de titres ni de manches : podium partout
    const podium = await tv.attend("salon_game_over");
    await regie.attend("salon_game_over");
    await alice.attend("salon_game_over");

    const score = (nom) => podium.scores.find((s) => s.username === nom);
    expect(score("alice").score).toBeGreaterThan(0);
    expect(score("bob").score).toBeGreaterThan(0);
    expect(score("carole").score).toBeGreaterThan(0);
    expect(score("alice").score).toBeGreaterThan(score("carole").score);
    expect(score("dora")).toMatchObject({ score: 7, left: true });
    expect(podium.scores.map((s) => s.score)).toEqual(
      podium.scores.map((s) => s.score).sort((a, b) => b - a),
    );

    // Le classement de soirée reprend les points de la partie
    expect(salonRooms[h.code].players.alice.night).toBe(score("alice").score);

    // En base : la partie et chaque joueur, parti compris
    expect(db.inserts.games).toHaveLength(1);
    const enBase = db.inserts.salon_players.at(-1).map((p) => p.username);
    expect(enBase.sort()).toEqual(["alice", "bob", "carole", "dora"]);

    // Jamais de YouTube ni d'appel réseau pendant la partie
    expect(db.exec).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  }, 20000);

  it("QCM : les choix partent sans dire lequel est juste, la revanche repart", async () => {
    const { tv, regie } = await ouvrir({ answerMode: "multiple" }, 1);
    const alice = await joueur("alice");
    const bob = await joueur("bob");

    regie.socket.emit("salon_start");
    const manche = await alice.attend("salon_round_start");
    expect(manche.choices.length).toBeGreaterThan(1);
    expect(manche.correctChoiceIndex).toBeUndefined();
    expect(manche.videoId).toBeUndefined();
    expect(manche.audioUrl).toBeUndefined();

    tv.socket.emit("salon_music_ready");
    await alice.attend("salon_timer_started");
    const juste = salonRooms[h.code].game.correctChoiceIndex;
    alice.socket.emit("salon_submit_choice", { choiceIndex: juste });
    bob.socket.emit("salon_submit_choice", {
      choiceIndex: (juste + 1) % manche.choices.length,
    });

    const podium = await tv.attend("salon_game_over");
    const score = (nom) => podium.scores.find((s) => s.username === nom).score;
    expect(score("alice")).toBeGreaterThan(score("bob"));
    const vue = await alice.attend("salon_game_over");
    expect(vue.ranking.me).toMatchObject({ username: "alice", rank: 1 });
    // Le téléphone ne reçoit jamais la liste complète des joueurs
    for (const ev of ["salon_roster", "salon_round_end", "salon_game_over"])
      for (const d of alice.de(ev)) {
        expect(d).not.toHaveProperty("players");
        expect(d).not.toHaveProperty("scores");
      }
    expect(alice.de("salon_round_end")[0].ranking.count).toBe(2);
    expect(alice.moi).not.toHaveProperty("players");

    regie.socket.emit("salon_restart");
    await alice.attend("salon_round_start", 2);
    expect(salonRooms[h.code].game.phase).toBe("round");
    expect(salonRooms[h.code].players.alice.score).toBe(0);
  }, 20000);

  it("le dernier joueur attendu coupe : la manche se clôt sans lui", async () => {
    const { tv, regie } = await ouvrir({}, 2);
    const alice = await joueur("alice");
    const bob = await joueur("bob");
    regie.socket.emit("salon_start");
    await alice.attend("salon_round_start");
    tv.socket.emit("salon_music_ready");
    await alice.attend("salon_timer_started");
    await repondreJuste(alice);
    await pause(40);
    expect(alice.de("salon_round_end")).toEqual([]);

    bob.socket.disconnect();
    await alice.attend("salon_round_end");
  }, 20000);

  it("un téléphone ne pilote rien, un écran sans clé ne reçoit aucun média", async () => {
    const { regie } = await ouvrir();
    const alice = await joueur("alice");

    const intrus = client();
    intrus.socket.emit("salon_join_host", { code: h.code, key: "mauvaise" });
    await intrus.attend("salon_error");

    alice.socket.emit("salon_start");
    alice.socket.emit("salon_end_game");
    alice.socket.emit("salon_kick", { username: "alice" });
    await pause(50);
    expect(salonRooms[h.code].game.phase).toBe("lobby");
    expect(salonRooms[h.code].players.alice).toBeDefined();

    regie.socket.emit("salon_start");
    await alice.attend("salon_round_start");
    await pause(50);
    expect(intrus.de("salon_round_start")).toEqual([]);
  }, 20000);

  it("des messages mal formés en pleine manche n'arrêtent pas la soirée", async () => {
    const { tv, regie } = await ouvrir({}, 1);
    const alice = await joueur("alice");
    regie.socket.emit("salon_start");
    await alice.attend("salon_round_start");
    tv.socket.emit("salon_music_ready");
    await alice.attend("salon_timer_started");

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const payload of [undefined, null, 42, [], {}, { guess: 42 }, "x"]) {
      alice.socket.emit("salon_submit_guess", payload);
      alice.socket.emit("salon_submit_choice", payload);
      alice.socket.emit("salon_pick_team", payload);
      regie.socket.emit("salon_kick", payload);
      regie.socket.emit("salon_update_settings", payload);
    }
    alice.socket.emit("salon_submit_guess", { guess: "x".repeat(100_000) });
    await pause(320);
    warn.mockRestore();

    await repondreJuste(alice);
    const podium = await alice.attend("salon_game_over");
    expect(podium.ranking.top[0].score).toBeGreaterThan(0);
  }, 20000);
});
