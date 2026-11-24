import { describe, it, expect, vi, beforeEach } from "vitest";

const s = vi.hoisted(() => ({ youtube: true, deezer: true }));

vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => ({}),
}));
vi.mock("../../../services/music/sources.js", () => ({
  sources: () => s,
}));
vi.mock("../../../services/music/deezer.js", () => ({
  fetchDeezerTrackPreview: async () => null,
  deezerPreviewMatch: async () => "https://cdn/extrait.mp3",
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

const { resolveMedia, checkSession, sourceCut } = await import("../media.js");
const { prefetchNextVideo } = await import("../session.js");
const { salonRooms } = await import("../../../state.js");

const salon = () => ({ settings: { roundDuration: 30 }, game: {} });
const epingle = () => ({ youtube_id: "pin", artist: "A", title: "T" });

describe("interrupteurs des sources du son", () => {
  beforeEach(() => Object.assign(s, { youtube: true, deezer: true }));

  it("tout allumé : la vidéo épinglée passe", async () => {
    expect((await resolveMedia(salon(), epingle())).video.id).toBe("pin");
  });

  it("YouTube coupé : l'extrait Deezer remplace la vidéo, même épinglée", async () => {
    s.youtube = false;
    expect(await resolveMedia(salon(), epingle())).toEqual({
      audio: "https://cdn/extrait.mp3",
      safeStart: 0,
    });
  });

  it("YouTube coupé après une vidéo déjà trouvée : plus de vidéo", async () => {
    const sa = salon();
    const t = epingle();
    await resolveMedia(sa, t);
    s.youtube = false;
    expect((await resolveMedia(sa, t)).audio).toBeTruthy();
  });

  it("Deezer coupé : la vidéo passe toujours", async () => {
    s.deezer = false;
    expect((await resolveMedia(salon(), epingle())).video.id).toBe("pin");
  });

  it("les deux coupés : erreur, la partie attend au lieu de sauter", async () => {
    Object.assign(s, { youtube: false, deezer: false });
    await expect(resolveMedia(salon(), epingle())).rejects.toThrow();
  });

  it("YouTube coupé : le lobby compte les titres en extrait, aucun introuvable", async () => {
    s.youtube = false;
    const t = epingle();
    const sa = {
      code: "SC1",
      settings: { roundDuration: 30 },
      game: { sessionPlaylist: [t], fullPlaylist: [t] },
    };
    await checkSession(sa, {});
    expect(sa.game.mediaCheck).toMatchObject({
      video: 0,
      audio: 1,
      missing: 0,
    });
  });

  it("YouTube coupé : rien de préchargé ni annoncé à la TV", async () => {
    s.youtube = false;
    const emis = [];
    const io = { to: () => ({ emit: (...a) => emis.push(a) }) };
    const t = epingle();
    salonRooms.SC2 = {
      code: "SC2",
      settings: { roundDuration: 30 },
      game: { sessionPlaylist: [t] },
    };
    prefetchNextVideo("SC2", io);
    await new Promise((r) => setTimeout(r, 0));
    expect(salonRooms.SC2.game.prefetchedRound).toBeNull();
    expect(emis).toEqual([]);
    delete salonRooms.SC2;
  });

  it("source coupée : signalée, pour ne pas accuser les titres", () => {
    expect(sourceCut()).toBe(false);
    s.deezer = false;
    expect(sourceCut()).toBe(true);
  });
});
