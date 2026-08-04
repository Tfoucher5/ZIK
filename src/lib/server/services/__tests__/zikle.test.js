import { describe, it, expect, vi } from "vitest";
import {
  mapDeezerChartTracks,
  getDayNumber,
  getOrCreateDailySong,
} from "../zikle.js";

describe("mapDeezerChartTracks", () => {
  it("filtre les titres sans preview et mappe les champs Deezer", () => {
    const json = {
      data: [
        {
          id: 111,
          title: "Titre A",
          artist: { name: "Artiste A" },
          preview: "https://cdn.deezer.com/a.mp3",
          album: { cover_xl: "https://cdn.deezer.com/a.jpg" },
        },
        {
          id: 222,
          title: "Sans preview",
          artist: { name: "Artiste B" },
          preview: null,
          album: {},
        },
      ],
    };
    const rows = mapDeezerChartTracks(json);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      artist: "Artiste A",
      title: "Titre A",
      preview_url: "https://cdn.deezer.com/a.mp3",
      cover_url: "https://cdn.deezer.com/a.jpg",
      external_id: "111",
      source: "deezer",
    });
  });
  it("tableau vide si data absent", () => {
    expect(mapDeezerChartTracks({})).toEqual([]);
  });
});

describe("getDayNumber", () => {
  it("renvoie le count exact", async () => {
    const sb = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          lte: vi.fn().mockResolvedValue({ count: 47, error: null }),
        })),
      })),
    };
    expect(await getDayNumber(sb, "2026-08-04")).toBe(47);
  });
});

describe("getOrCreateDailySong", () => {
  it("renvoie null si le pool est épuisé (RPC ne renvoie aucune ligne)", async () => {
    const sb = { rpc: vi.fn().mockResolvedValue({ data: [], error: null }) };
    expect(await getOrCreateDailySong(sb)).toBeNull();
  });
  it("renvoie date/trackId depuis la RPC", async () => {
    const sb = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ date: "2026-08-04", track_id: "abc-123", is_new: true }],
        error: null,
      }),
    };
    expect(await getOrCreateDailySong(sb)).toEqual({
      date: "2026-08-04",
      trackId: "abc-123",
    });
  });
});
