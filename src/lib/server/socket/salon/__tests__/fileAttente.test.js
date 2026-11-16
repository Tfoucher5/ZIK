import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

// Vrai serveur Socket.io, vrais clients : salon gratuit plein, file d'attente
const db = vi.hoisted(() => ({ lignes: [] }));
vi.mock("../../../config.js", () => {
  const query = (table) => {
    const chain = new Proxy(
      {},
      {
        get(_, name) {
          if (name === "then")
            return (resolve) =>
              resolve({
                data: table === "custom_playlist_tracks" ? db.lignes : null,
                error: null,
              });
          return () => chain;
        },
      },
    );
    return chain;
  };
  const client = {
    from: query,
    rpc: async () => ({ data: null, error: null }),
  };
  client.schema = () => client;
  return { supabase: client, getAdminClient: () => client };
});
vi.mock("../../../services/music/deezer.js", () => ({
  fetchDeezerTrackPreview: async () => null,
  deezerPreviewMatch: async () => null,
  iTunesPreviewMatch: async () => null,
}));

const { salonRooms } = await import("../../../state.js");
const { soiree, pause, SECRETS, LIGNES_PLAYLIST } =
  await import("./soireeHarness.js");
db.lignes = LIGNES_PLAYLIST;

const h = soiree();

beforeAll(async () => {
  await h.start();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("réseau interdit en test");
    }),
  );
});

afterAll(async () => {
  await h.nettoyer();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await h.stop();
});

describe("file d'attente d'un salon gratuit plein", () => {
  it("13e et 14e attendent, le 13e entre quand une place se libère, le 14e ne voit rien", async () => {
    const { tv, regie } = await h.ouvrir();
    const joueurs = [];
    for (let i = 1; i <= 12; i++) joueurs.push(await h.joueur(`j${i}`));

    const attente = (username) => {
      const c = h.client();
      c.socket.emit("salon_join_player", {
        code: h.code,
        username,
        wait: true,
      });
      return c;
    };
    const treize = attente("treize");
    await treize.attend("salon_waiting");
    const quatorze = attente("quatorze");
    await quatorze.attend("salon_waiting");
    expect(regie.de("salon_pro_required")).toHaveLength(2);
    expect(salonRooms[h.code].waiting.map((w) => w.username)).toEqual([
      "treize",
      "quatorze",
    ]);

    joueurs[0].socket.disconnect();
    const entree = await treize.attend("salon_joined");
    expect(entree.username).toBe("treize");
    expect(quatorze.de("salon_joined")).toEqual([]);

    regie.socket.emit("salon_start");
    await tv.attend("salon_round_start");
    tv.socket.emit("salon_music_ready");
    await treize.attend("salon_timer_started");
    await pause(40);
    expect(quatorze.de("salon_round_start")).toEqual([]);
    expect(quatorze.recus.map((r) => r.event)).toEqual(["salon_waiting"]);
    expect(JSON.stringify(quatorze.recus)).not.toMatch(SECRETS);
  });
});
