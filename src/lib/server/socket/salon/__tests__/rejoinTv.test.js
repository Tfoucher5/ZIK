import { describe, it, expect, beforeEach, vi } from "vitest";

// Base simulée : chaque test choisit ce que renvoient les fonctions SQL
const db = vi.hoisted(() => ({ reply: () => ({ data: null, error: null }) }));

// TV rechargée en pleine soirée : média et révélation renvoyés aux seuls écrans à clé.
// Supabase et YouTube sont neutralisés.
vi.mock("../../../config.js", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null }) }),
        in: async () => ({ data: [] }),
      }),
      insert: () => ({
        select: () => ({ single: async () => ({ data: { id: "g1" } }) }),
        then: (r) => r({ error: null }),
      }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
    rpc: async () => ({ data: null, error: null }),
  },
  getAdminClient: () => ({
    schema: (s) =>
      s === "salon"
        ? {
            rpc: async (fn, args) => db.reply(fn, args),
            from: () => ({
              insert: () => ({ then: (r) => r({ error: null }) }),
            }),
          }
        : null,
  }),
}));
vi.mock("../../game/audio.js", () => ({
  validPreviewUrl: () => null,
}));
vi.mock("../../../services/music/deezer.js", () => ({
  fetchDeezerTrackPreview: async () => null,
  deezerPreviewMatch: async () => null,
}));
const { salonRooms } = await import("../../../state.js");
const { registerSalon } = await import("../index.js");
const { CODE, CLE, makeIo, makeSocket, salonDeTest } =
  await import("./salonHarness.js");

// Incident du 19/11 : TV rechargée en pleine soirée, musique muette jusqu'à la manche suivante
describe("TV qui revient en pleine manche", () => {
  let h;

  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    db.reply = () => ({ data: null, error: null });
    salonDeTest();
    Object.assign(salonRooms[CODE].game, {
      phase: "round",
      currentRound: 3,
      currentTrack: { id: "t1", title: "T", artist: "A" },
      currentVideo: { id: "vid123", start: 40, audio: false },
      timerActive: true,
      timerMax: 30,
      endsAt: Date.now() + 18_000,
    });
    salonRooms[CODE].players.Ana = {
      username: "Ana",
      token: "jeton-ana",
      score: 0,
      team: null,
      stats: { found: 0, first: 0 },
      foundFeats: [],
      foundExtras: [],
    };
    h = makeIo();
    registerSalon(h.io);
  });

  async function rejoint(evt, payload, attendu) {
    const s = makeSocket(evt, h.rooms);
    const msgs = [];
    s.emit = (event, p) => msgs.push({ event, p });
    h.connecte(s);
    await s.handlers[evt](payload);
    return msgs.find((m) => m.event === attendu)?.p;
  }

  it("la TV reçoit la vidéo en cours, calée sur le temps déjà joué", async () => {
    const tv = await rejoint(
      "salon_join_host",
      { code: CODE, key: CLE },
      "salon_host_joined",
    );
    expect(tv.media.videoId).toBe("vid123");
    // 12 s jouées sur 30 : la vidéo reprend vers 40 + 12
    expect(tv.media.startSeconds).toBeGreaterThanOrEqual(51);
    expect(tv.media.startSeconds).toBeLessThanOrEqual(52);
    expect(tv.roundEnd).toBeNull();
  });

  it("musique en train de charger (chrono pas lancé) : reprise au début de l'extrait", async () => {
    Object.assign(salonRooms[CODE].game, { timerActive: false, endsAt: 0 });
    const tv = await rejoint(
      "salon_join_host",
      { code: CODE, key: CLE },
      "salon_host_joined",
    );
    expect(tv.media).toEqual({ videoId: "vid123", startSeconds: 40 });
  });

  it("en pause : reprise au point de la pause", async () => {
    Object.assign(salonRooms[CODE].game, { paused: true, remainingMs: 25_000 });
    const tv = await rejoint(
      "salon_join_host",
      { code: CODE, key: CLE },
      "salon_host_joined",
    );
    expect(tv.media.startSeconds).toBe(45);
  });

  it("extrait audio sans vidéo : la TV reçoit l'extrait", async () => {
    salonRooms[CODE].game.currentVideo = {
      id: "https://cdn/extrait.mp3",
      start: 0,
      audio: true,
    };
    const tv = await rejoint(
      "salon_join_host",
      { code: CODE, key: CLE },
      "salon_host_joined",
    );
    expect(tv.media).toEqual({ audioUrl: "https://cdn/extrait.mp3" });
  });

  it("pendant la révélation, la TV retrouve la réponse ; pas de média", async () => {
    Object.assign(salonRooms[CODE].game, {
      phase: "summary",
      lastRoundEnd: { answer: "A - T", cover: "c.jpg", scores: [] },
    });
    const tv = await rejoint(
      "salon_join_host",
      { code: CODE, key: CLE },
      "salon_host_joined",
    );
    expect(tv.media).toBeNull();
    expect(tv.roundEnd).toMatchObject({ answer: "A - T", cover: "c.jpg" });
  });

  it("panne vidéo en cours : rien n'est relancé, le titre en échec ne repart pas", async () => {
    salonRooms[CODE].game.videoOutage = true;
    Object.assign(salonRooms[CODE].game, { timerActive: false, endsAt: 0 });
    const tv = await rejoint(
      "salon_join_host",
      { code: CODE, key: CLE },
      "salon_host_joined",
    );
    expect(tv.media).toBeNull();
  });

  it("intro éclair lancée : la musique reste coupée", async () => {
    salonRooms[CODE].game.special = "flash";
    const tv = await rejoint(
      "salon_join_host",
      { code: CODE, key: CLE },
      "salon_host_joined",
    );
    expect(tv.media).toBeNull();
  });

  it("revanche lancée depuis une révélation : plus de réponse de la partie d'avant", async () => {
    Object.assign(salonRooms[CODE].game, {
      phase: "summary",
      lastRoundEnd: { answer: "A - T", cover: "c.jpg", scores: [] },
    });
    const regie = makeSocket("rg", h.rooms);
    h.connecte(regie);
    await regie.handlers.salon_join_control({ code: CODE, key: CLE });
    await regie.handlers.salon_restart();
    expect(salonRooms[CODE].game.lastRoundEnd).toBeNull();
  });

  it("le téléphone et une TV sans clé ne reçoivent ni le média ni la réponse", async () => {
    const tel = await rejoint(
      "salon_join_player",
      { code: CODE, username: "Ana", token: "jeton-ana" },
      "salon_joined",
    );
    expect(JSON.stringify(tel)).not.toMatch(/vid123/);
    const intrus = await rejoint(
      "salon_join_host",
      { code: CODE, key: "mauvaise" },
      "salon_host_joined",
    );
    expect(intrus).toBeUndefined();
  });
});
