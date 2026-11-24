import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  afterEach,
} from "vitest";

// Nom de la soirée : nettoyé à la création, envoyé aux téléphones pour la story
const db = vi.hoisted(() => ({ lignes: [] }));
vi.mock("../../../config.js", () => {
  const chain = new Proxy(
    {},
    {
      get(_, name) {
        if (name === "then")
          return (resolve) => resolve({ data: db.lignes, error: null });
        return () => chain;
      },
    },
  );
  const client = {
    from: () => chain,
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
const { soiree, LIGNES_PLAYLIST } = await import("./soireeHarness.js");

db.lignes = LIGNES_PLAYLIST;
const h = soiree();

beforeAll(async () => {
  await h.start();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("réseau interdit en test");
    }),
  );
});
afterEach(() => h.nettoyer());
afterAll(async () => {
  vi.unstubAllGlobals();
  await h.stop();
});

describe("nom de la soirée", () => {
  it("nettoyé à la création et reçu par le téléphone qui rejoint", async () => {
    await h.ouvrir({ title: "  Quiz   du jeudi  " });
    expect(salonRooms[h.code].settings.title).toBe("Quiz du jeudi");
    const ana = await h.joueur("Ana");
    expect(ana.moi.settings.title).toBe("Quiz du jeudi");
  });

  it("entrées hostiles : 10 000 signes, nombre, objet → 30 signes ou rien, salon créé", async () => {
    for (const [title, attendu] of [
      ["x".repeat(10_000), "x".repeat(30)],
      [42, null],
      [{ length: 1 }, null],
      ["   ", null],
      [undefined, null],
    ]) {
      await h.ouvrir({ title });
      expect(salonRooms[h.code].settings.title).toBe(attendu);
      await h.nettoyer();
    }
  });
});
