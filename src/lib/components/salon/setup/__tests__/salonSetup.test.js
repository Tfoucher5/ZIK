import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ list: [], saved: null, fetch: vi.fn() }));
vi.mock("../../../../data/salonPlaylists.js", () => ({
  loadSalonPlaylists: async () => m.list,
}));
vi.mock("../../../../client/salonClient.js", async (orig) => ({
  ...(await orig()),
  fetchPro: async () => null,
  readSetup: () => m.saved,
  saveSalonKey: () => {},
  saveSetup: () => {},
}));

const { SalonSetup, initialSelection } =
  await import("../salonSetup.svelte.js");

const pl = (id, group = "official") => ({
  id,
  name: id,
  trackCount: 10,
  group,
});

function page(search = "") {
  vi.stubGlobal("fetch", m.fetch);
  const sb = {
    auth: { getSession: async () => ({ data: { session: null } }) },
  };
  return new SalonSetup({ sb }, new URLSearchParams(search));
}

beforeEach(() => {
  m.list = [pl("a"), pl("b"), pl("c", "public")];
  m.saved = null;
  m.fetch.mockReset();
});

describe("création de soirée : aucune playlist cochée d'office", () => {
  it("initialSelection : le lien d'abord, puis la dernière préparation, sinon rien", () => {
    const list = [pl("a"), pl("b")];
    expect(initialSelection(list, ["b", "x"], ["a"])).toEqual(["b"]);
    expect(initialSelection(list, ["x"], ["a", "zz"])).toEqual(["a"]);
    expect(initialSelection(list, [""], [])).toEqual([]);
  });

  it("première visite : rien n'est coché", async () => {
    const s = page();
    s.restore();
    await s.load(null);
    expect(s.playlistsState).toBe("ok");
    expect(s.selectedIds).toEqual([]);
  });

  it("?playlist= coche les playlists demandées qui existent", async () => {
    const s = page("?playlist=c,inconnue");
    await s.load(null);
    expect(s.selectedIds).toEqual(["c"]);
  });

  it("habitué : sa dernière préparation revient", async () => {
    m.saved = { playlistIds: ["b"], settings: { maxRounds: 15 } };
    const s = page();
    s.restore();
    await s.load(null);
    expect(s.selectedIds).toEqual(["b"]);
    expect(s.maxRounds).toBe(15);
  });

  it("déconnexion : ses propres playlists sortent de la sélection", async () => {
    const s = page();
    m.list = [pl("a"), pl("moi", "mine")];
    await s.load("u1");
    s.selectedIds = ["a", "moi"];
    m.list = [pl("a")];
    await s.load(null);
    expect(s.selectedIds).toEqual(["a"]);
  });

  it("sans playlist, créer ne contacte pas le serveur et le dit", async () => {
    const s = page();
    await s.load(null);
    await s.create();
    expect(m.fetch).not.toHaveBeenCalled();
    expect(s.error).toBe("Choisis au moins une playlist.");
  });

  it("réseau coupé à la création : message calme, bouton rendu", async () => {
    const s = page();
    await s.load(null);
    s.selectedIds = ["a"];
    m.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    await s.create();
    expect(s.error).toBe("La connexion a coupé. Réessaie.");
    expect(s.creating).toBe(false);
  });

  it("offre gratuite : plus de 2 équipes ouvre l'offre Pro au lieu de choisir", () => {
    const s = page();
    s.pickTeams(4);
    expect(s.teamCount).toBe(0);
    expect(s.upsell).toBe("teams");
    s.pickTeams(2);
    expect(s.teamCount).toBe(2);
  });
});
