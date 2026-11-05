import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ byName: vi.fn() }));

vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => ({}),
}));
vi.mock("../../../services/music/deezer.js", () => ({
  fetchDeezerTrackPreview: async () => null,
  deezerPreviewMatch: m.byName,
}));
vi.mock("../../game/audio.js", () => ({
  validPreviewUrl: () => null,
}));
vi.mock("../../../services/music/trackIssues.js", () => ({
  DEFAULT_VIDEO_SETTINGS: { exclude: [], minStart: 15 },
  getVideoSettings: async () => ({ exclude: [], minStart: 15 }),
  pickStart: ({ pinned }) => pinned ?? 42,
}));
vi.mock("../players.js", () => ({
  staff: () => ({ emit: () => {} }),
}));

const { resolveMedia, findVideo, checkSession } = await import("../media.js");

const salon = () => ({
  code: "ABC",
  settings: { roundDuration: 30 },
  game: { sessionPlaylist: [] },
});

describe("média d'un titre", () => {
  beforeEach(() => m.byName.mockReset().mockResolvedValue(null));

  it("vidéo épinglée : jouée telle quelle", async () => {
    const res = await resolveMedia(salon(), {
      youtube_id: "pin",
      youtube_start: 12,
    });
    expect(res).toEqual({ video: { id: "pin" }, safeStart: 12 });
  });

  it("vidéo en cache : jouée sans chercher d'extrait", async () => {
    const res = await resolveMedia(salon(), {
      cachedVideo: { id: "cache", duration: 200 },
    });
    expect(res.video.id).toBe("cache");
    expect(m.byName).not.toHaveBeenCalled();
  });

  it("aucune vidéo connue : extrait Deezer", async () => {
    m.byName.mockResolvedValue("https://cdn/extrait.mp3");
    const res = await resolveMedia(salon(), { artist: "A", title: "T" });
    expect(res).toEqual({ audio: "https://cdn/extrait.mp3", safeStart: 0 });
  });

  it("ni vidéo ni extrait : erreur, pour que la partie attende", async () => {
    await expect(
      resolveMedia(salon(), { artist: "A", title: "T" }),
    ).rejects.toThrow("No video");
  });

  it("deux demandes simultanées gardent le même départ", async () => {
    const s = salon();
    const track = { cachedVideo: { id: "v", duration: 200 } };
    const [a, b] = await Promise.all([
      findVideo(s, track),
      findVideo(s, track),
    ]);
    expect(a).toBe(b);
  });

  it("vérification du lobby : vidéos, extraits, titres manquants", async () => {
    const s = salon();
    m.byName.mockImplementation(async (_, title) =>
      title === "audio" ? "https://cdn/x.mp3" : null,
    );
    s.game.sessionPlaylist = [
      { title: "pin", youtube_id: "p" },
      { title: "audio", artist: "A" },
      { title: "rien", artist: "A" },
    ];
    await checkSession(s, {});
    expect(s.game.mediaCheck).toEqual({
      total: 3,
      video: 1,
      audio: 1,
      missing: 1,
    });
  });
});
