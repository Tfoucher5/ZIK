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
const { serializeSalon, reviveSalon, saveSnapshot, restoreSalon } =
  await import("../snapshot.js");
const { timerClock } = await import("../timers.js");

const io = {
  to: () => ({ emit: () => {} }),
  sockets: { adapter: { rooms: new Map() }, sockets: new Map() },
};
const { salonEnManche, nettoie, viaBase, titresDe, revive } =
  await import("./snapshotHarness.js");

beforeEach(() => {
  calls.length = 0;
  reponse = { data: null, error: null };
  for (const k of Object.keys(salonRooms)) delete salonRooms[k];
});

describe("instantané d'un salon", () => {
  it("tout l'état passe en JSON, sans timers, sockets ni caches", () => {
    const salon = salonEnManche();
    salon.game._resolving = { gen: 1 };
    const data = serializeSalon(salon);
    nettoie(salon);
    // Une Map ou un timer oublié ne survivrait pas à l'aller-retour
    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
    expect(data._hostDcTimer).toBeUndefined();
    expect(data._coalesce).toBeUndefined();
    expect(data.game.interval).toBeUndefined();
    expect(data.game.videos).toBeUndefined();
    expect(data.game._resolving).toBeUndefined();
    expect(data.players.Ana._dcTimer).toBeUndefined();
    expect(data.banned).toEqual(["troll", "jeton-banni"]);
    expect(Object.values(data.departed)[0]).toMatchObject({
      username: "Zoe",
      score: 80,
    });
  });

  it("si l'hôte avait mis en pause, la pause est gardée et rien ne repart seul", () => {
    const salon = salonEnManche();
    salon.game.paused = true;
    const revu = revive(salon);
    nettoie(salon);
    expect(revu.game).toMatchObject({ phase: "summary", paused: true });
    expect(revu.game.restored).toBeUndefined();
  });

  it("une manche coupée est rejouée au retour de la TV, scores d'avant la manche", () => {
    const salon = salonEnManche();
    const revu = revive(salon);
    nettoie(salon);
    const g = revu.game;
    expect(g).toMatchObject({
      phase: "summary",
      paused: false,
      restored: "manche",
      currentRound: 1,
    });
    expect(g.timerActive).toBe(false);
    // Plus d'heure de fin : les écrans ne comptent pas, la reprise relance la manche
    expect(timerClock(g).endsAt).toBeNull();
    expect(g.interval).toBeNull();
    expect(revu.banned.has("troll")).toBe(true);
    expect(revu.players.Ana).toMatchObject({ score: 300, night: 900, team: 0 });
    // Parti pendant la manche coupée : ses points de la manche sautent aussi
    expect(Object.values(revu.departed)[0].score).toBe(50);
    // Le titre coupé repasse en tête (pop prend la fin de la liste)
    expect(g.sessionPlaylist.at(-1).id).toBe("t1");
    expect(g.played.map((t) => t.id)).toEqual(["t0"]);
    // Mêmes objets que fullPlaylist : session.js compare par identité
    expect(g.played[0]).toBe(g.fullPlaylist[0]);
    expect(g.sessionPlaylist[0]).toBe(g.fullPlaylist[3]);
    expect(g.currentTrack).toBe(g.fullPlaylist[1]);
    // Vidéo déjà trouvée : pas de nouvelle recherche YouTube
    expect(g.videos.get(g.fullPlaylist[1])).toEqual({ id: "v1" });
  });

  it("coupure pendant la recherche de la vidéo : la manche est aussi rejouée", () => {
    const salon = salonEnManche();
    salon.game.phase = "summary"; // startNextRound attend encore resolveMedia
    const revu = revive(salon);
    nettoie(salon);
    expect(revu.game.currentRound).toBe(1);
    expect(revu.game.played.map((t) => t.id)).toEqual(["t0"]);
  });

  it("deux titres au même id restent distincts", () => {
    const salon = salonEnManche();
    const g = salon.game;
    g.fullPlaylist[2].id = g.fullPlaylist[3].id = "doublon";
    const revu = revive(salon);
    nettoie(salon);
    expect(revu.game.sessionPlaylist[0]).toBe(revu.game.fullPlaylist[3]);
    expect(revu.game.sessionPlaylist[1]).toBe(revu.game.fullPlaylist[2]);
  });

  it("sans sa ligne de titres, le salon repart avec les titres de la soirée", () => {
    const salon = salonEnManche();
    const revu = reviveSalon(viaBase(salon), null);
    nettoie(salon);
    const g = revu.game;
    expect(g.fullPlaylist.map((t) => t.id).sort()).toEqual([
      "t0",
      "t1",
      "t2",
      "t3",
    ]);
    // La manche coupée est quand même rejouée
    expect(g.played.map((t) => t.id)).toEqual(["t0"]);
    expect(g.sessionPlaylist.at(-1).id).toBe("t1");
    expect(g.played[0]).toBe(g.fullPlaylist[0]);
    expect(g.videos).toBeUndefined();
  });

  it("des titres d'une autre version ne sont pas reliés à l'état", () => {
    const salon = salonEnManche();
    const etat = viaBase(salon);
    const autres = { at: 2, tracks: [{ id: "x" }, { id: "y" }] };
    const revu = reviveSalon(etat, autres);
    nettoie(salon);
    expect(revu.game.fullPlaylist.map((t) => t.id)).not.toContain("x");
    expect(revu.game.played.map((t) => t.id)).toEqual(["t0"]);
  });

  it("le lobby et le podium reviennent tels quels", () => {
    for (const phase of ["lobby", "gameover"]) {
      const salon = salonEnManche();
      salon.game.phase = phase;
      salon.game.history.push({ answer: "x" });
      const revu = revive(salon);
      nettoie(salon);
      expect(revu.game).toMatchObject({
        phase,
        paused: false,
        currentRound: 2,
      });
      expect(revu.players.Ana.score).toBe(450);
    }
  });

  it("une base injoignable ne lève jamais", async () => {
    reponse = "panne";
    const salon = salonEnManche();
    await expect(saveSnapshot(salon)).resolves.toBeNull();
    nettoie(salon);
  });
});

describe("reprise à la demande", () => {
  it("reprend un salon absent de la mémoire, une seule lecture pour deux écrans", async () => {
    vi.useFakeTimers();
    try {
      const salon = salonEnManche();
      const etat = viaBase(salon);
      const titres = titresDe(salon);
      reponse = (fn, a) => ({
        data: [{ code: a.p_code, data: a.p_code === "SNAP01" ? etat : titres }],
        error: null,
      });
      nettoie(salon);
      await Promise.all([
        restoreSalon("SNAP01", io, {}),
        restoreSalon("SNAP01", io, {}),
      ]);
      const lectures = calls.filter(([fn]) => fn === "load_salon_snapshot");
      expect(lectures.map(([, a]) => a.p_code)).toEqual([
        "SNAP01",
        "SNAP01:titres",
      ]);
      const revu = salonRooms.SNAP01;
      expect(revu.game.played[0]).toBe(revu.game.fullPlaylist[0]);
      expect(revu.adminKey).toBe("cle");
      expect(revu.players.Ana).toMatchObject({
        _disconnected: true,
        socketId: null,
      });

      // Personne ne revient : les joueurs passent dans les partis, score gardé
      vi.advanceTimersByTime(10 * 60_000 + 1000);
      expect(revu.players.Ana).toBeUndefined();
      expect(Object.values(revu.departed).map((d) => d.username)).toEqual([
        "Zoe",
        "Ana",
        "Bob",
      ]);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it("sans instantané ou instantané illisible, rien n'est créé", async () => {
    await restoreSalon("ABSENT", io, {});
    expect(salonRooms.ABSENT).toBeUndefined();
    reponse = { data: [{ code: "ABSENT", data: { code: "ABSENT" } }] };
    await restoreSalon("ABSENT", io, {});
    expect(salonRooms.ABSENT).toBeUndefined();
  });

  it("un client qui essaie des codes au hasard est vite ignoré", async () => {
    const socket = {};
    for (let i = 0; i < 12; i++) await restoreSalon(`HASARD${i}`, io, socket);
    expect(calls).toHaveLength(5);
    // Un autre client (TV qui se reconnecte) n'est pas concerné
    await restoreSalon("HASARD0", io, {});
    expect(calls).toHaveLength(6);
  });
});
