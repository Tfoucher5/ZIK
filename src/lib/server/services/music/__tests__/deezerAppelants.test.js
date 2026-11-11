import { describe, it, expect, vi, beforeEach } from "vitest";

// Chaque appelant passe par le client commun, dans le bon mode
const dz = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("../deezerClient.js", () => ({ deezerFetch: dz.fetch }));
vi.mock("../../cards/maintenance.js", () => ({ enqueueCardEnrichment() {} }));
vi.mock("../../cards/enrich.js", () => ({ enrichTrack: vi.fn() }));
const maj = vi.hoisted(() => []);
vi.mock("$lib/server/config.js", () => {
  const chaine = {
    select: () => chaine,
    in: () => chaine,
    is: () => chaine,
    not: () => chaine,
    limit: async () => ({
      data: [{ id: 1, external_id: "5", source: "deezer" }],
    }),
    update: (v) => ({ eq: async () => maj.push(v) }),
  };
  const sb = { from: () => chaine };
  sb.schema = () => sb;
  return { getAdminClient: () => sb };
});

const QUOTA = { error: { code: 4, message: "Quota limit exceeded" } };
const { refreshZiklePool } = await import("../../zikle.js");
const { correctCard } = await import("../../cards/admin.js");
const { backfillCovers } = await import("../coverBackfill.js");
const { matchLines, searchTracks } = await import("../deezerCatalog.js");
const { fetchDeezerTrackPreview, deezerPreviewMatch } =
  await import("../deezer.js");

const mode = () => dz.fetch.mock.calls.map(([, o]) => Boolean(o?.bulk));

beforeEach(() => {
  dz.fetch.mockReset();
  maj.length = 0;
});

describe("appels de partie et de recherche : jamais freinés", () => {
  it.each([
    ["extrait par id", () => fetchDeezerTrackPreview("1")],
    ["extrait par nom", () => deezerPreviewMatch("A", "T")],
    ["recherche", () => searchTracks("x").catch(() => null)],
    ["correction de carte", () => correctCard({}, "c", "123")],
  ])("%s : refus de quota rendu sans planter", async (_, appel) => {
    dz.fetch.mockResolvedValue(QUOTA);
    await appel();
    expect(mode()).toEqual([false]);
  });

  it("correction de carte refusée : message clair", async () => {
    dz.fetch.mockResolvedValue(QUOTA);
    expect(await correctCard({}, "c", "123")).toEqual({
      error: "Titre Deezer introuvable",
    });
  });
});

describe("appels de fond : freinés", () => {
  it("collage de liste", async () => {
    dz.fetch.mockResolvedValue({ data: [] });
    await matchLines(["Daft Punk - One More Time"]);
    expect(mode().every(Boolean)).toBe(true);
  });

  it("Zikle : refus de quota, rien de rafraîchi", async () => {
    dz.fetch.mockResolvedValue(QUOTA);
    expect(await refreshZiklePool({}, true)).toEqual({
      refreshed: false,
      added: 0,
    });
    expect(mode()).toEqual([true]);
  });

  it("pochettes : refus de quota, aucune écriture", async () => {
    dz.fetch.mockResolvedValue(QUOTA);
    await backfillCovers(["p1"]);
    expect(mode()).toEqual([true]);
    expect(maj).toEqual([]);
  });

  it("pochettes : réponse lue et écrite", async () => {
    dz.fetch.mockResolvedValue({ album: { cover_xl: "https://c/x.jpg" } });
    await backfillCovers(["p2"]);
    expect(maj).toEqual([{ cover_url: "https://c/x.jpg" }]);
  });
});
