import { describe, it, expect, beforeEach, vi } from "vitest";

// Signalement du 21/11 : 3 titres pour 5 manches, la partie s'arrêtait net
// à « 3 / 5 ». Le total annoncé est maintenant le vrai nombre de manches.
vi.mock("../../game/audio.js", () => ({ validPreviewUrl: () => null }));
vi.mock("../../../services/music/deezer.js", () => ({
  fetchDeezerTrackPreview: async () => null,
  deezerPreviewMatch: async () => null,
}));
vi.mock("../snapshot.js", () => ({
  saveSnapshot: async () => {},
  freezeAndSaveAll: async () => {},
  purgeSnapshots: async () => {},
  dropSnapshot: async () => {},
  restoreSalon: async () => {},
}));
vi.mock("../persist.js", () => ({ recordSalonGameEnd: () => {} }));
vi.mock("../../../services/music/trackIssues.js", () => ({
  reportTrackIssue: () => {},
}));
vi.mock("../tracks.js", () => ({
  mediaOf: (t) => ({ trackId: t.id }),
  buildSessionPlaylist: () => [],
  currentTrackInfo: () => null,
  knownVideo: async (t) => {
    if (t.title.startsWith("KO")) throw new Error("No video");
    return { video: { id: `v-${t.title}` }, safeStart: 0 };
  },
}));

const { salonRooms } = await import("../../../state.js");
const { startNextRound, skipTrack } = await import("../rounds.js");
const { roundsTotal, settingsView } = await import("../session.js");

const CODE = "COURT1";
const envois = [];
const io = {
  to: (room) => ({ emit: (ev, data) => envois.push({ room, ev, data }) }),
  sockets: { adapter: { rooms: new Map() }, sockets: new Map() },
};
const t = (title) => ({ id: title, title, artist: "A", playlistId: "p1" });

function salon(full, session, maxRounds, phase = "lobby") {
  salonRooms[CODE] = {
    code: CODE,
    settings: { maxRounds, roundDuration: 30, answerMode: "free" },
    players: {},
    game: {
      phase,
      currentRound: 0,
      fullPlaylist: full,
      sessionPlaylist: session,
      played: [],
      history: [],
    },
  };
  return salonRooms[CODE];
}
const debuts = () =>
  envois.filter((e) => e.ev === "salon_round_start").map((e) => e.data.total);

describe("les manches suivent les titres", () => {
  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    envois.length = 0;
  });

  it("3 titres pour 5 manches : total 3 annoncé, partie finie après 3", async () => {
    const titres = [t("a"), t("b"), t("c")];
    const s = salon(titres, [...titres], 5);
    expect(roundsTotal(s)).toBe(3);
    expect(settingsView(s)).toMatchObject({ maxRounds: 5, rounds: 3 });
    for (let i = 0; i < 3; i++) {
      await startNextRound(CODE, io);
      clearTimeout(s.game.musicReadyTimer);
    }
    expect(new Set(debuts())).toEqual(new Set([3]));
    expect(roundsTotal(s)).toBe(3);
    await startNextRound(CODE, io);
    expect(s.game.phase).toBe("gameover");
    expect(s.game.currentRound).toBe(3);
  });

  it("assez de titres : le choix de l'organisateur reste le total", () => {
    const titres = Array.from({ length: 12 }, (_, i) => t("t" + i));
    expect(roundsTotal(salon(titres, titres.slice(0, 10), 10))).toBe(10);
  });

  it("lobby pas encore préparé : le choix de l'organisateur", () => {
    expect(roundsTotal(salon([t("a")], [], 5))).toBe(5);
  });

  it("titre injouable sans réserve : le total baisse de 1, la régie est prévenue", async () => {
    const a = t("a");
    const b = t("b");
    const c = t("c");
    const s = salon([a, b, c], [c, b, a], 5);
    await startNextRound(CODE, io);
    clearTimeout(s.game.musicReadyTimer);
    expect(roundsTotal(s)).toBe(3);
    skipTrack(CODE, io);
    await vi.waitFor(() => expect(s.game.currentTrack).toBe(b));
    clearTimeout(s.game.musicReadyTimer);
    expect(roundsTotal(s)).toBe(2);
    await vi.waitFor(() => expect(debuts().at(-1)).toBe(2));
    expect(new Set(debuts())).toEqual(new Set([3, 2]));
    const court = envois.find((e) => e.ev === "salon_short");
    expect(court).toEqual({
      room: `salon:ctrl:${CODE}`,
      ev: "salon_short",
      data: { rounds: 2 },
    });
    expect(s._journal.map((j) => j.text)).toContain(
      "Plus de titre en réserve : la partie fera 2 manches.",
    );
  });

  it("titre injouable avec réserve : le total ne bouge pas, pas d'alerte", async () => {
    const a = t("a");
    const b = t("b");
    const spare = t("spare");
    const s = salon([a, b, spare], [b, a], 2);
    await startNextRound(CODE, io);
    clearTimeout(s.game.musicReadyTimer);
    skipTrack(CODE, io);
    // La réserve passe sous la pile : le titre suivant reste le prochain
    await vi.waitFor(() => expect(s.game.currentTrack).toBe(b));
    expect(s.game.sessionPlaylist).toEqual([spare]);
    clearTimeout(s.game.musicReadyTimer);
    expect(roundsTotal(s)).toBe(2);
    expect(envois.some((e) => e.ev === "salon_short")).toBe(false);
  });
});
