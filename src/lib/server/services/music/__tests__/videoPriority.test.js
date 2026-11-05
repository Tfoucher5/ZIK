import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const m = vi.hoisted(() => ({
  search: vi.fn(),
  tables: {},
  tableErrors: {},
  trackQueries: [],
  tracksFor: () => [],
  inColumns: {},
  ownerBatches: [],
  trackSelect: null,
  gte: null,
  or: null,
}));

vi.mock("../../../config.js", () => {
  const query = (table) => {
    let ids;
    let rows = () => m.tables[table] ?? [];
    const result = () =>
      m.tableErrors[table]
        ? { data: null, error: { message: m.tableErrors[table] } }
        : { data: rows(), error: null };
    const q = {
      select: (columns) => {
        if (table === "tracks") m.trackSelect = columns;
        return q;
      },
      is: () => q,
      or: (filter) => {
        m.or = filter;
        return q;
      },
      neq: (col, value) => {
        const before = rows;
        rows = () => before().filter((r) => r[col] !== value);
        return q;
      },
      gte: (col, value) => {
        m.gte = { col, value };
        return q;
      },
      order: () => q,
      in: (col, values) => {
        ids = values;
        m.inColumns[table] = col;
        if (table === "custom_playlists") m.ownerBatches.push(values.length);
        if (table === "rooms") {
          const before = rows;
          rows = () => before().filter((r) => values.includes(r[col]));
        }
        return q;
      },
      limit: async () => {
        if (table !== "tracks") return result();
        m.trackQueries.push(ids);
        const data = m.tracksFor(ids);
        return data instanceof Error
          ? { data: null, error: { message: data.message } }
          : { data, error: null };
      },
      then: (resolve) => resolve(result()),
      update: () => ({ eq: async () => ({ error: null }) }),
    };
    return q;
  };
  return { supabase: {}, getAdminClient: () => ({ from: query }) };
});
vi.mock("../../../socket/game/audio.js", () => ({ ytsQuery: m.search }));
vi.mock("../trackIssues.js", () => ({
  getVideoSettings: async () => ({ exclude: [], minStart: 15 }),
  filterVideos: (videos) => videos,
}));

const titre = { id: "t1", artist: "Stromae", title: "Papaoutai" };
const SALON = "11111111-1111-1111-1111-111111111111";
const PRO = "22222222-2222-2222-2222-222222222222";
const JOUEE = "33333333-3333-3333-3333-333333333333";
const JOUEE_PEU = "44444444-4444-4444-4444-444444444444";
const proActif = {
  user_id: "u1",
  status: "active",
  current_period_end: "2999-01-01T00:00:00Z",
};
const uuid = (i) => `${1e7 + i}-0000-0000-0000-000000000000`;

// Le cache des priorités vit dans le module : un import neuf par test
async function resolver() {
  vi.resetModules();
  return import("../videoResolver.js");
}
const salons = async () => (await import("../../../state.js")).salonRooms;
const ouvrirSalon = async (playlistIds) => {
  (await salons()).ABC = {
    game: { phase: "lobby" },
    settings: { playlistIds },
  };
};

describe("ordre de priorité des titres", () => {
  let warn;
  beforeEach(async () => {
    m.trackQueries = [];
    m.tableErrors = {};
    m.tracksFor = () => [];
    m.inColumns = {};
    m.ownerBatches = [];
    m.gte = null;
    m.or = null;
    m.tables = {
      pro_subscriptions: [proActif],
      custom_playlists: [{ id: PRO }],
      games: [
        { room_id: "PEU" },
        { room_id: "SOUVENT" },
        { room_id: "SOUVENT" },
      ],
      rooms: [
        { code: "PEU", playlist_id: JOUEE_PEU, room_playlists: [] },
        {
          code: "SOUVENT",
          playlist_id: null,
          room_playlists: [{ playlist_id: JOUEE }],
        },
      ],
    };
    m.search.mockReset().mockResolvedValue({ results: [] });
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const rooms = await salons();
    for (const code of Object.keys(rooms)) delete rooms[code];
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("salon ouvert d'abord : son titre passe avant ceux des Pro", async () => {
    const { resolveNextVideo } = await resolver();
    await ouvrirSalon([SALON]);
    m.tracksFor = (ids) => (ids?.includes(SALON) ? [titre] : []);
    expect(await resolveNextVideo()).toBe("empty");
    expect(m.trackQueries).toEqual([[SALON]]);
  });

  it("ordre complet : salon, Pro, rooms par nombre de parties, puis le reste", async () => {
    const { resolveNextVideo } = await resolver();
    await ouvrirSalon([SALON]);
    expect(await resolveNextVideo()).toBe("idle");
    expect(m.trackQueries).toEqual([
      [SALON],
      [PRO],
      [JOUEE, JOUEE_PEU],
      undefined,
    ]);
  });

  it("requêtes : filtre sur la table liée, 30 jours de parties, retente à 7 jours", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-05T12:00:00Z") });
    const { resolveNextVideo } = await resolver();
    await resolveNextVideo();
    expect(m.inColumns.tracks).toBe("custom_playlist_tracks.playlist_id");
    // Sans !inner, le filtre sur la table liée ne filtre plus les titres
    expect(m.trackSelect).toContain("custom_playlist_tracks!inner");
    expect(m.inColumns.custom_playlists).toBe("owner_id");
    expect(m.gte).toEqual({
      col: "started_at",
      value: "2026-10-06T12:00:00.000Z",
    });
    expect(m.or).toContain("video_search_at.lt.2026-10-29T12:00:00.000Z");
  });

  it("manche démarrée pendant le choix du titre : pas de recherche", async () => {
    const { resolveNextVideo } = await resolver();
    const rooms = await salons();
    m.tracksFor = () => {
      rooms.ABC = { game: { phase: "round" } };
      return [titre];
    };
    expect(await resolveNextVideo()).toBe("paused");
    expect(m.search).not.toHaveBeenCalled();
  });

  it("abonnement expiré ou annulé : pas de priorité Pro", async () => {
    const { resolveNextVideo } = await resolver();
    m.tables.pro_subscriptions = [
      { ...proActif, current_period_end: "2000-01-01T00:00:00Z" },
      { ...proActif, status: "canceled" },
    ];
    await resolveNextVideo();
    expect(m.trackQueries).toEqual([[JOUEE, JOUEE_PEU], undefined]);
  });

  it("une partie de salon ne compte pas dans les plus jouées", async () => {
    const { resolveNextVideo } = await resolver();
    m.tables.pro_subscriptions = [];
    m.tables.games = [
      { room_id: "PEU", source: "web" },
      { room_id: "CODE", source: "salon" },
      { room_id: "CODE", source: "salon" },
    ];
    m.tables.rooms.push({
      code: "CODE",
      playlist_id: JOUEE,
      room_playlists: [],
    });
    await resolveNextVideo();
    expect(m.trackQueries).toEqual([[JOUEE_PEU], undefined]);
  });

  it("seules les 20 rooms les plus jouées passent en priorité", async () => {
    const { resolveNextVideo } = await resolver();
    m.tables.pro_subscriptions = [];
    const codes = Array.from({ length: 21 }, (_, i) => `R${i}`);
    m.tables.games = codes.flatMap((code, i) =>
      Array.from({ length: i + 1 }, () => ({ room_id: code })),
    );
    m.tables.rooms = codes.map((code) => ({
      code,
      playlist_id: code,
      room_playlists: [],
    }));
    await resolveNextVideo();
    expect(m.trackQueries[0]).toHaveLength(20);
    expect(m.trackQueries[0]).not.toContain("R0");
    expect(m.trackQueries[0][0]).toBe("R20");
  });

  it("id invalide ou salon sans réglages : ignorés, la tâche continue", async () => {
    const { resolveNextVideo } = await resolver();
    await ouvrirSalon(["pas-un-uuid", 42, SALON]);
    (await salons()).XYZ = { game: { phase: "lobby" } };
    await resolveNextVideo();
    expect(m.trackQueries[0]).toEqual([SALON]);
  });

  it("liste énorme : plafonnée à 300 ids et sans doublon", async () => {
    const { resolveNextVideo } = await resolver();
    await ouvrirSalon([
      SALON,
      SALON,
      ...Array.from({ length: 1000 }, (_, i) => uuid(i)),
    ]);
    await resolveNextVideo();
    expect(m.trackQueries[0]).toHaveLength(300);
    expect(m.trackQueries[0].filter((id) => id === SALON)).toHaveLength(1);
  });

  it("plus de 300 comptes Pro : playlists lues par paquets", async () => {
    const { resolveNextVideo } = await resolver();
    m.tables.pro_subscriptions = Array.from({ length: 301 }, (_, i) => ({
      ...proActif,
      user_id: `u${i}`,
    }));
    await resolveNextVideo();
    expect(m.ownerBatches).toEqual([300, 1]);
    expect(m.trackQueries[0]).toEqual([PRO]);
  });

  it("groupe en erreur : sauté, le catalogue continue sans pause", async () => {
    const { resolveNextVideo } = await resolver();
    await ouvrirSalon([SALON]);
    m.tracksFor = (ids) => {
      if (ids?.includes(SALON)) return new Error("URI too long");
      return ids ? [] : [titre];
    };
    expect(await resolveNextVideo()).toBe("empty");
    expect(m.search).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledOnce();
  });

  it("rooms en panne : la priorité Pro reste", async () => {
    const { resolveNextVideo } = await resolver();
    m.tableErrors = { games: "panne" };
    await resolveNextVideo();
    expect(m.trackQueries).toEqual([[PRO], undefined]);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("calcul entièrement en panne : ordre normal, nouvel essai après 5 min", async () => {
    vi.useFakeTimers();
    const { resolveNextVideo } = await resolver();
    m.tableErrors = { pro_subscriptions: "panne", games: "panne" };
    m.tracksFor = () => [titre];
    expect(await resolveNextVideo()).toBe("empty");
    expect(m.trackQueries).toEqual([undefined]);

    m.tableErrors = {};
    m.tracksFor = () => [];
    m.trackQueries = [];
    vi.advanceTimersByTime(4 * 60 * 1000);
    await resolveNextVideo();
    expect(m.trackQueries).toEqual([undefined]);

    m.trackQueries = [];
    vi.advanceTimersByTime(60 * 1000 + 1);
    await resolveNextVideo();
    expect(m.trackQueries[0]).toEqual([PRO]);
  });

  it("priorités gardées une heure : pas de recalcul à chaque titre", async () => {
    vi.useFakeTimers();
    const { resolveNextVideo } = await resolver();
    await resolveNextVideo();
    m.tables.custom_playlists = [{ id: SALON }];
    m.trackQueries = [];
    vi.advanceTimersByTime(59 * 60 * 1000);
    await resolveNextVideo();
    expect(m.trackQueries[0]).toEqual([PRO]);

    vi.advanceTimersByTime(60 * 1000 + 1);
    m.trackQueries = [];
    await resolveNextVideo();
    expect(m.trackQueries[0]).toEqual([SALON]);
  });
});
