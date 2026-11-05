import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const m = vi.hoisted(() => ({ inserts: [], stats: 0, partie: 0 }));

vi.mock("../../../config.js", () => {
  const query = (table) => {
    const chain = new Proxy(
      {},
      {
        get(_, name) {
          if (name === "then")
            return (resolve) =>
              resolve({
                data: table === "games" ? { id: `partie${++m.partie}` } : null,
                error: null,
              });
          if (name === "insert")
            return (rows) => {
              if (table === "game_players") m.inserts.push(rows);
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
    rpc: async (fn) => {
      if (fn === "update_player_stats") m.stats++;
      return { data: null, error: null };
    },
  };
  return { supabase: client, getAdminClient: () => client };
});
vi.mock("../../../services/achievements.js", () => ({
  checkAchievements: async () => [],
  saveGameResult: async () => null,
}));
vi.mock("../../../services/weeklyChallenge.js", () => ({
  bumpWeeklyChallenge: () => {},
}));
vi.mock("../cardSettle.js", () => ({ settleCards: async () => {} }));
vi.mock("../../../services/music/trackIssues.js", () => ({
  reportTrackIssue: () => {},
}));
vi.mock("../../../services/music/deezer.js", () => ({
  fetchDeezerTrackPreview: async (id) => `https://cdn/${id}.mp3`,
  deezerPreviewMatch: async () => null,
  iTunesPreviewMatch: async () => null,
}));
const titres = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  title: `Titre${i}`,
  artist: "Artiste",
  mainArtist: "Artiste",
  cleanTitle: `titre${i}`,
  cleanArtist: "artiste",
  external_id: String(100 + i),
  featArtists: [],
}));
vi.mock("../../../services/music/playlist.js", () => ({
  loadPlaylist: async () => titres,
}));

const { getOrCreateRoom } = await import("../rooms.js");
const { beginGame } = await import("../lobby.js");
const { finishGame } = await import("../rounds.js");

const io = { to: () => ({ emit: () => {} }) };
let room;

async function jouer() {
  await beginGame(room, io);
  clearTimeout(room.game.readyTimer);
  room.players.alice.score = 5;
  await finishGame(room, io);
}

describe("revanche dans la même room", () => {
  beforeEach(() => {
    m.inserts = [];
    m.stats = 0;
    room = getOrCreateRoom(`revanche-${Math.random()}`);
    room.game.maxRounds = 2;
    room.players.alice = {
      name: "alice",
      userId: "u1",
      isGuest: false,
      score: 0,
    };
  });
  afterEach(() => {
    clearTimeout(room.game.readyTimer);
  });

  it("chaque partie est enregistrée, pas seulement la première", async () => {
    await jouer();
    expect(m.inserts).toHaveLength(1);
    await jouer();
    expect(m.inserts).toHaveLength(2);
    expect(m.inserts[1][0]).toMatchObject({ username: "alice", score: 5 });
    expect(m.inserts[1][0].game_id).not.toBe(m.inserts[0][0].game_id);
    expect(m.stats).toBe(2);
  });

  it("une même partie n'est jamais comptée deux fois", async () => {
    await jouer();
    await finishGame(room, io);
    expect(m.inserts).toHaveLength(1);
    expect(m.stats).toBe(1);
  });
});
