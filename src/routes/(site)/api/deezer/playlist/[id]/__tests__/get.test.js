import { describe, it, expect, vi, beforeEach } from "vitest";

const dz = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("$lib/server/services/music/deezerClient.js", () => ({
  deezerFetch: dz.fetch,
}));
vi.mock("$lib/server/middleware/auth.js", () => ({ checkRateLimit() {} }));

const { GET } = await import("../+server.js");

const titre = (id) => ({
  id,
  title: `T${id}`,
  artist: { name: "A" },
  album: { cover_xl: "c" },
});
const importer = async (id) => {
  const res = await GET({
    params: { id },
    request: new Request("http://x"),
  });
  return { status: res.status, body: await res.json() };
};

beforeEach(() => dz.fetch.mockReset());

describe("GET /api/deezer/playlist/[id]", () => {
  it("identifiant numérique : playlist importée, en appel de fond", async () => {
    dz.fetch
      .mockResolvedValueOnce({ title: "P", nb_tracks: 2 })
      .mockResolvedValueOnce({ data: [titre(1), titre(2)] });
    const { status, body } = await importer("908622995");
    expect(status).toBe(200);
    expect(body.tracks.map((t) => t.external_id)).toEqual(["1", "2"]);
    expect(dz.fetch.mock.calls[0]).toEqual([
      "/playlist/908622995",
      { bulk: true, timeout: 10000 },
    ]);
  });

  it.each(["abc", "1?x=y", "..", "12/../34"])(
    "identifiant %s refusé sans appel à Deezer",
    async (id) => {
      expect((await importer(id)).status).toBe(502);
      expect(dz.fetch).not.toHaveBeenCalled();
    },
  );

  it("page de titres en échec : la boucle s'arrête, la route répond", async () => {
    dz.fetch
      .mockResolvedValueOnce({ title: "P", nb_tracks: 300 })
      .mockResolvedValueOnce({
        data: Array.from({ length: 100 }, (_, i) => titre(i)),
      })
      .mockRejectedValueOnce(new Error("Deezer HTTP 503"));
    const { status, body } = await importer("1");
    expect(status).toBe(200);
    expect(body.tracks).toHaveLength(100);
  });
});
