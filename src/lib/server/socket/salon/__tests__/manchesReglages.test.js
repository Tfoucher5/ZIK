import { describe, it, expect, beforeEach, vi } from "vitest";

// Le vrai total suit un changement de playlist ou de nombre de manches, en
// lobby comme en partie (fiche playlist trop courte, 24/11)
vi.mock("../../../config.js", () => ({ supabase: {} }));
vi.mock("../../../middleware/auth.js", () => ({ userClient: () => ({}) }));
vi.mock("../../../services/pro.js", () => ({ isPro: async () => false }));
vi.mock("../snapshot.js", () => ({ saveSnapshot: async () => {} }));
vi.mock("../players.js", () => ({
  broadcastRoster: () => {},
  teamLimit: () => 2,
  staff: () => ({ emit: () => {} }),
}));
vi.mock("../timers.js", () => ({
  armNext: () => {},
  scheduleCleanup: () => {},
}));
vi.mock("../media.js", () => ({
  checkSession: async () => {},
  findVideo: async () => ({ video: { id: "v" }, safeStart: 0 }),
  previewUrl: async () => null,
}));
let pool = [];
vi.mock("../tracks.js", () => ({
  loadSalonTracks: async () => pool,
  buildSessionPlaylist: (tracks, n) => tracks.slice(0, Math.max(0, n)),
}));

const { salonRooms, setIO } = await import("../../../state.js");
const { changeSalonPlaylists, applySettings } = await import("../rooms.js");

const CODE = "REGL01";
const envois = [];
setIO({ to: () => ({ emit: (ev, data) => envois.push({ ev, data }) }) });
const io = { to: () => ({ emit: (ev, data) => envois.push({ ev, data }) }) };
const titres = (n, p = "t") =>
  Array.from({ length: n }, (_, i) => ({ id: p + i, title: p + i }));
const dernierTotal = () =>
  envois.filter((e) => e.ev === "salon_settings").at(-1)?.data.settings.rounds;

function salon({ full, maxRounds, phase = "lobby", round = 0, pile }) {
  salonRooms[CODE] = {
    code: CODE,
    adminKey: "cle",
    settings: { maxRounds, roundDuration: 30, answerMode: "free" },
    players: {},
    game: {
      phase,
      currentRound: round,
      fullPlaylist: full,
      sessionPlaylist: pile ?? full.slice(0, maxRounds),
      played: full.slice(0, round),
    },
  };
  return salonRooms[CODE];
}

describe("le vrai total suit les réglages", () => {
  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    envois.length = 0;
  });

  it("lobby : une playlist ajoutée fait remonter le total au choix", async () => {
    salon({ full: titres(3), maxRounds: 5 });
    pool = titres(12);
    await changeSalonPlaylists({ code: CODE, playlistIds: ["a"], key: "cle" });
    expect(dernierTotal()).toBe(5);
  });

  it("en partie : le reste et le total sont les vrais", async () => {
    salon({
      full: titres(3),
      maxRounds: 10,
      phase: "summary",
      round: 2,
      pile: [],
    });
    pool = titres(4, "n");
    const r = await changeSalonPlaylists({
      code: CODE,
      playlistIds: ["b"],
      key: "cle",
    });
    // 8 manches restaient à jouer, la nouvelle sélection n'a que 4 titres
    expect(r.remainingRounds).toBe(4);
    expect(dernierTotal()).toBe(6);
  });

  it("lobby : plus de manches choisies que de titres, le total reste aux titres", () => {
    salon({ full: titres(3), maxRounds: 5 });
    applySettings(CODE, { maxRounds: 10 }, io, () => true);
    expect(salonRooms[CODE].settings.maxRounds).toBe(10);
    expect(dernierTotal()).toBe(3);
  });

  it("en partie : manches ajoutées, total borné par les titres restants", () => {
    const full = titres(6);
    salon({
      full,
      maxRounds: 5,
      phase: "summary",
      round: 2,
      pile: full.slice(2, 5),
    });
    applySettings(CODE, { maxRounds: 10 }, io, () => true);
    expect(dernierTotal()).toBe(6);
  });
});
