import { describe, it, expect, beforeEach, vi } from "vitest";

const calls = [];
let reponse = { data: null, error: null };
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => ({
    schema: (s) =>
      s === "salon"
        ? {
            rpc: async (fn, args) => {
              calls.push([fn, args]);
              if (reponse === "panne") throw new Error("fetch failed");
              return typeof reponse === "function"
                ? reponse(fn, args)
                : reponse;
            },
          }
        : null,
  }),
}));

const { salonRooms } = await import("../../../state.js");
const {
  reviveSalon,
  saveSnapshot,
  restoreSalon,
  freezeAndSaveAll,
  dropSnapshot,
} = await import("../snapshot.js");
const { broadcastRoster } = await import("../players.js");

const io = {
  to: () => ({ emit: () => {} }),
  sockets: { adapter: { rooms: new Map() }, sockets: new Map() },
};
const { salonEnManche, nettoie, viaBase, json } =
  await import("./snapshotHarness.js");

beforeEach(() => {
  calls.length = 0;
  reponse = { data: null, error: null };
  for (const k of Object.keys(salonRooms)) delete salonRooms[k];
});

describe("sauvegardes", () => {
  it("un changement de joueurs est sauvegardé, au plus une fois par seconde", () => {
    vi.useFakeTimers();
    try {
      const salon = salonEnManche();
      salonRooms[salon.code] = salon;
      for (let i = 0; i < 5; i++) broadcastRoster(salon.code, io);
      const saves = () =>
        calls.filter(
          ([fn, a]) => fn === "save_salon_snapshot" && a.p_code === "SNAP01",
        ).length;
      expect(saves()).toBe(1);
      vi.advanceTimersByTime(1100);
      expect(saves()).toBe(2);
      nettoie(salon);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it("la playlist entière part à part, une fois, pas à chaque sauvegarde", async () => {
    const salon = salonEnManche();
    await saveSnapshot(salon);
    await saveSnapshot(salon);
    nettoie(salon);
    const saves = calls.filter(([fn]) => fn === "save_salon_snapshot");
    const titres = saves.filter(([, a]) => a.p_code === "SNAP01:titres");
    const etats = saves.filter(([, a]) => a.p_code === "SNAP01");
    expect(titres).toHaveLength(1);
    expect(titres[0][1].p_data.tracks).toHaveLength(4);
    expect(etats).toHaveLength(2);
    for (const [, a] of etats)
      expect(a.p_data.game.fullPlaylist).toBeUndefined();
  });

  it("titres réécrits quand la playlist change, et retentés après un échec", async () => {
    const salon = salonEnManche();
    reponse = (fn, a) =>
      a.p_code.endsWith(":titres")
        ? { data: null, error: { message: "délai dépassé" } }
        : { data: null, error: null };
    vi.spyOn(console, "error").mockImplementation(() => {});
    await saveSnapshot(salon);
    await new Promise((r) => setTimeout(r));
    reponse = { data: null, error: null };
    await saveSnapshot(salon);
    salon.game.fullPlaylist = salon.game.fullPlaylist.slice(1);
    await saveSnapshot(salon);
    await saveSnapshot(salon);
    nettoie(salon);
    const titres = calls.filter(([, a]) => a.p_code === "SNAP01:titres");
    expect(titres.map(([, a]) => a.p_data.tracks.length)).toEqual([4, 4, 3]);
    vi.restoreAllMocks();
  });

  it("un code de ligne de titres ne se reprend pas comme un salon", async () => {
    await restoreSalon("SNAP01:titres", io, {});
    expect(calls).toHaveLength(0);
  });

  it("titres rafraîchis toutes les 30 min, pour ne pas expirer avant l'état", async () => {
    vi.useFakeTimers();
    try {
      const salon = salonEnManche();
      await saveSnapshot(salon);
      vi.advanceTimersByTime(29 * 60_000);
      await saveSnapshot(salon);
      vi.advanceTimersByTime(60_000);
      await saveSnapshot(salon);
      nettoie(salon);
      const titres = calls.filter(([, a]) => a.p_code === "SNAP01:titres");
      expect(titres).toHaveLength(2);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it("deux versions des titres s'écrivent dans l'ordre", async () => {
    const ordre = [];
    let lente = true;
    reponse = async (fn, a) => {
      if (a.p_code.endsWith(":titres")) {
        if (lente) {
          lente = false;
          await new Promise((r) => setTimeout(r, 20));
        }
        ordre.push(a.p_data.tracks.length);
      }
      return { data: null, error: null };
    };
    const salon = salonEnManche();
    const a = saveSnapshot(salon);
    salon.game.fullPlaylist = salon.game.fullPlaylist.slice(1);
    await Promise.all([a, saveSnapshot(salon)]);
    nettoie(salon);
    expect(ordre).toEqual([4, 3]);
  });

  it("la fermeture supprime l'état et ses titres", async () => {
    await dropSnapshot("SNAP01");
    expect(
      calls
        .filter(([fn]) => fn === "delete_salon_snapshot")
        .map(([, a]) => a.p_code),
    ).toEqual(["SNAP01", "SNAP01:titres"]);
  });

  it("les titres sont lus avec 30 min de marge sur l'état", async () => {
    const salon = salonEnManche();
    const etat = viaBase(salon);
    nettoie(salon);
    reponse = (fn, a) => ({
      data: a.p_code === "SNAP01" ? [{ code: "SNAP01", data: etat }] : [],
      error: null,
    });
    await restoreSalon("SNAP01", io, {});
    const lectures = calls.filter(([fn]) => fn === "load_salon_snapshot");
    expect(lectures.map(([, a]) => a.p_max_age_seconds)).toEqual([7200, 9000]);
    nettoie(salonRooms.SNAP01);
  });

  it("un instantané d'avant la 3.23.1 garde sa playlist au déploiement", () => {
    const salon = salonEnManche();
    const ancien = viaBase(salon);
    delete ancien.game.refs.playlist;
    ancien.game.fullPlaylist = json(salon.game.fullPlaylist);
    nettoie(salon);
    const g = reviveSalon(ancien, null).game;
    expect(g.fullPlaylist).toHaveLength(4);
    expect(g.played[0]).toBe(g.fullPlaylist[0]);
    expect(g.sessionPlaylist[0]).toBe(g.fullPlaylist[3]);
    expect(g.videos.get(g.fullPlaylist[1])).toEqual({ id: "v1" });
  });

  it("manche coupée après un changement de playlist : le bon titre est rejoué", () => {
    const salon = salonEnManche();
    // Joués et titre en cours viennent de l'ancienne sélection
    const g0 = salon.game;
    g0.fullPlaylist = g0.fullPlaylist.map((t) => ({ ...t }));
    const revu = reviveSalon(viaBase(salon), null);
    nettoie(salon);
    expect(revu.game.played.map((t) => t.id)).toEqual(["t0"]);
    expect(revu.game.sessionPlaylist.at(-1).id).toBe("t1");
  });

  it("SIGTERM attend que la ligne des titres soit écrite", async () => {
    let ecrite = false;
    reponse = async (fn, a) => {
      if (a.p_code.endsWith(":titres")) {
        await new Promise((r) => setTimeout(r, 20));
        ecrite = true;
      }
      return { data: null, error: null };
    };
    const salon = salonEnManche();
    await saveSnapshot(salon);
    nettoie(salon);
    expect(ecrite).toBe(true);
  });

  it("reprise après un changement de playlist en pleine partie : le titre coupé est rejoué", () => {
    const salon = salonEnManche();
    const g0 = salon.game;
    g0.fullPlaylist = g0.fullPlaylist.map((t) => ({ ...t }));
    const etat = viaBase(salon);
    const titres = json({ at: salon._playlistAt, tracks: g0.fullPlaylist });
    nettoie(salon);
    const g = reviveSalon(etat, titres).game;
    expect(g.played.map((t) => t.id)).toEqual(["t0"]);
    expect(g.sessionPlaylist.at(-1).id).toBe("t1");
  });

  // En dernier : après le gel, saveSnapshot ne fait plus rien
  it("SIGTERM : les chronos s'arrêtent, puis plus aucune autre écriture", async () => {
    vi.useFakeTimers();
    try {
      const salon = salonEnManche();
      salonRooms[salon.code] = salon;
      let ticks = 0;
      clearInterval(salon.game.interval);
      salon.game.interval = setInterval(() => ticks++, 1000);
      await freezeAndSaveAll();
      vi.advanceTimersByTime(5000);
      expect(ticks).toBe(0);
      expect(salon.game.interval).toBeNull();
      const saves = () => calls.filter(([fn]) => fn === "save_salon_snapshot");
      // La sauvegarde du gel attend aussi la ligne des titres
      expect(saves().map(([, a]) => a.p_code)).toEqual([
        "SNAP01",
        "SNAP01:titres",
      ]);
      await saveSnapshot(salon);
      expect(saves()).toHaveLength(2);
      nettoie(salon);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});
