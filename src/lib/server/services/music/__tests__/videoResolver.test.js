import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const m = vi.hoisted(() => ({ next: [], updates: [], search: vi.fn() }));

vi.mock("../../../config.js", () => {
  const query = (table) => {
    const q = {
      select: () => q,
      is: () => q,
      or: () => q,
      order: () => q,
      neq: () => q,
      gte: () => q,
      in: () => q,
      limit: async () => ({
        data: table === "tracks" ? m.next : [],
        error: null,
      }),
      then: (resolve) => resolve({ data: [], error: null }),
      update: (fields) => ({
        eq: async (_, id) => {
          m.updates.push({ id, fields });
          return { error: null };
        },
      }),
    };
    return q;
  };
  const sb = { from: query };
  sb.schema = () => sb;
  return { supabase: {}, getAdminClient: () => sb };
});
vi.mock("../../../socket/game/audio.js", () => ({ ytsQuery: m.search }));
vi.mock("../trackIssues.js", () => ({
  getVideoSettings: async () => ({ exclude: ["live"], minStart: 15 }),
  filterVideos: (videos, exclude) => {
    const kept = videos.filter((v) => !v.title.includes(exclude[0]));
    return kept.length ? kept : videos;
  },
}));

const { salonRooms } = await import("../../../state.js");
const { resolveNextVideo, nextDelay, pickVideo, startVideoResolver } =
  await import("../videoResolver.js");

const titre = { id: "t1", artist: "Stromae feat. X", title: "Papaoutai" };
const video = (id, title, channel = "Chaîne") => ({
  id,
  title,
  duration: 200_000,
  channel: { name: channel },
});

describe("résolution des vidéos hors partie", () => {
  beforeEach(() => {
    m.next = [titre];
    m.updates = [];
    m.search.mockReset();
    for (const code of Object.keys(salonRooms)) delete salonRooms[code];
  });

  it.each(["round", "summary"])(
    "salon en phase %s : aucune recherche",
    async (phase) => {
      salonRooms.ABC = { code: "ABC", game: { phase } };
      expect(await resolveNextVideo()).toBe("paused");
      expect(m.search).not.toHaveBeenCalled();
    },
  );

  it.each(["lobby", "gameover"])(
    "salon au repos (%s) : la recherche continue",
    async (phase) => {
      salonRooms.ABC = { code: "ABC", game: { phase } };
      m.search.mockResolvedValue({ results: [] });
      expect(await resolveNextVideo()).toBe("empty");
    },
  );

  it("ne repropose pas la vidéo refusée par une TV", async () => {
    m.next = [{ ...titre, video_refused_id: "refusee" }];
    m.search.mockResolvedValue({
      results: [video("refusee", "A"), video("autre", "B")],
    });
    expect(await resolveNextVideo()).toBe("found");
    expect(m.updates[0].fields.video_cache_id).toBe("autre");
  });

  it("seule vidéo trouvée déjà refusée : aucune vidéo", async () => {
    m.next = [{ ...titre, video_refused_id: "refusee" }];
    m.search.mockResolvedValue({ results: [video("refusee", "A")] });
    expect(await resolveNextVideo()).toBe("empty");
  });

  it("rien à résoudre : aucune recherche", async () => {
    m.next = [];
    expect(await resolveNextVideo()).toBe("idle");
    expect(m.search).not.toHaveBeenCalled();
  });

  it("vidéo trouvée : gardée en cache, recherche sur l'artiste principal", async () => {
    m.search.mockResolvedValue({ results: [video("v1", "Papaoutai")] });
    expect(await resolveNextVideo()).toBe("found");
    expect(m.search).toHaveBeenCalledWith("Stromae - Papaoutai");
    expect(m.updates[0].id).toBe("t1");
    expect(m.updates[0].fields).toMatchObject({
      video_cache_id: "v1",
      video_cache_duration: 200,
    });
    expect(m.updates[0].fields.video_search_at).toBeTruthy();
  });

  it("aucun résultat : date notée, pour ne pas chercher en boucle", async () => {
    m.search.mockResolvedValue({ results: [] });
    expect(await resolveNextVideo()).toBe("empty");
    expect(m.updates[0].fields.video_search_at).toBeTruthy();
    expect(m.updates[0].fields.video_cache_id).toBeUndefined();
  });

  it("recherche en échec : rien d'écrit, le titre sera repris", async () => {
    m.search.mockResolvedValue({ results: [], failed: true });
    expect(await resolveNextVideo()).toBe("blocked");
    expect(m.updates).toEqual([]);
  });

  it("YouTube bloque : longue pause, sinon le rythme normal", () => {
    expect(nextDelay("blocked")).toBe(30 * 60 * 1000);
    expect(nextDelay("idle")).toBe(5 * 60 * 1000);
    for (const r of ["found", "empty", "paused"])
      expect(nextDelay(r)).toBe(30 * 1000);
  });

  it("préfère une chaîne « - Topic » et écarte les mots exclus", () => {
    expect(
      pickVideo(
        [video("a", "live"), video("b", "X"), video("c", "Y", "S - Topic")],
        ["live"],
      ).id,
    ).toBe("c");
    expect(pickVideo([video("a", "x live")], ["live"]).id).toBe("a");
    expect(pickVideo([], ["live"])).toBeUndefined();
  });
});

describe("démarrage de la tâche de fond", () => {
  beforeEach(() => {
    m.next = [titre];
    m.search.mockReset();
    for (const code of Object.keys(salonRooms)) delete salonRooms[code];
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("ne tourne pas hors de Railway", () => {
    vi.useFakeTimers();
    vi.stubEnv("RAILWAY_ENVIRONMENT_NAME", "");
    startVideoResolver();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("une erreur ne casse pas la boucle, et le rythme ralentit", async () => {
    vi.useFakeTimers();
    vi.stubEnv("RAILWAY_ENVIRONMENT_NAME", "test");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    m.search.mockRejectedValue(new Error("panne"));
    startVideoResolver();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(warn).toHaveBeenCalledOnce();
    expect(m.search).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(m.search).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    expect(m.search).toHaveBeenCalledTimes(2);
  });
});
