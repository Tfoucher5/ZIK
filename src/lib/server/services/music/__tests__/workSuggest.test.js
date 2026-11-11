import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ deezer: vi.fn() }));
vi.mock("../../../config.js", async () =>
  (await import("../../__tests__/fakeQuery.js")).fakeClients(h),
);
vi.mock("../deezerClient.js", () => ({ deezerFetch: h.deezer }));

const { suggestWorks, saveWorks, canEditPlaylist, PAGE } =
  await import("../workSuggest.js");
const { getAdminClient } = await import("../../../config.js");

const PL = "11111111-1111-1111-1111-111111111111";
const row = (id, o = {}) => ({
  id,
  track_id: `t${id}`,
  custom_artist: null,
  custom_title: null,
  tracks: {
    artist: "Cast - Aristocats",
    title: `Titre ${id}`,
    external_id: `dz${id}`,
    source: "deezer",
  },
  track_answers: [],
  ...o,
});
const film = (value) => [{ value, answer_types: { name: "Film" } }];

beforeEach(() => {
  h.reset();
  h.deezer.mockReset().mockResolvedValue({ album: { title: "Best Of" } });
});

describe("suggestWorks", () => {
  it("ne propose que pour les titres sans œuvre", async () => {
    h.tables.custom_playlist_tracks = {
      data: [row("a", { track_answers: film("Vaiana") }), row("b")],
    };
    h.tables.track_answers = { data: [] };
    const { suggestions } = await suggestWorks(getAdminClient(), PL, "moi");
    expect(suggestions).toEqual([
      {
        id: "b",
        artist: "Cast - Aristocats",
        title: "Titre b",
        value: "Aristocats",
      },
    ]);
  });

  it("un personnage n'est pas une œuvre : le titre reste à remplir", async () => {
    h.tables.custom_playlist_tracks = {
      data: [
        row("a", {
          track_answers: [
            { value: "Maui", answer_types: { name: "Personnage" } },
          ],
        }),
      ],
    };
    h.tables.track_answers = { data: [] };
    const { suggestions } = await suggestWorks(getAdminClient(), PL, "moi");
    expect(suggestions.map((s) => s.id)).toEqual(["a"]);
  });

  it("le film saisi ailleurs pour la même chanson passe avant Deezer", async () => {
    h.tables.custom_playlist_tracks = { data: [row("b")] };
    h.tables.track_answers = {
      data: [
        {
          value: "Les Aristochats",
          answer_types: { name: "Film" },
          custom_playlist_tracks: {
            track_id: "tb",
            custom_playlists: { owner_id: "x", is_public: true },
          },
        },
      ],
    };
    const { suggestions } = await suggestWorks(getAdminClient(), PL, "moi");
    expect(suggestions[0].value).toBe("Les Aristochats");
    expect(h.deezer).not.toHaveBeenCalled();
  });

  it("album de bande originale lu sur Deezer, en appel de fond", async () => {
    h.tables.custom_playlist_tracks = {
      data: [
        row("b", { tracks: { ...row("b").tracks, artist: "Prisca Demarez" } }),
      ],
    };
    h.tables.track_answers = { data: [] };
    h.deezer.mockResolvedValue({
      album: {
        title: "La Reine des Neiges (Bande Originale Française du Film)",
      },
    });
    const { suggestions } = await suggestWorks(getAdminClient(), PL, "moi");
    expect(suggestions[0].value).toBe("La Reine des Neiges");
    expect(h.deezer).toHaveBeenCalledWith("/track/dzb", { bulk: true });
  });

  it("troupe renommée à la main en nom de film : ce nom est proposé", async () => {
    h.tables.custom_playlist_tracks = {
      data: [row("b", { custom_artist: "Les Aristochats" })],
    };
    h.tables.track_answers = { data: [] };
    const { suggestions } = await suggestWorks(getAdminClient(), PL, "moi");
    expect(suggestions[0]).toMatchObject({
      artist: "Les Aristochats",
      value: "Les Aristochats",
    });
    expect(h.deezer).not.toHaveBeenCalled();
  });

  it("Deezer en panne : pas de proposition, pas d'erreur", async () => {
    h.tables.custom_playlist_tracks = {
      data: [row("b", { tracks: { ...row("b").tracks, artist: "X" } })],
    };
    h.tables.track_answers = { data: [] };
    h.deezer.mockRejectedValue(new Error("down"));
    const { suggestions } = await suggestWorks(getAdminClient(), PL, "moi");
    expect(suggestions[0].value).toBeNull();
  });

  it("le film saisi dans la playlist privée d'un autre n'est pas proposé", async () => {
    h.tables.custom_playlist_tracks = {
      data: [row("b", { tracks: { ...row("b").tracks, artist: "X" } })],
    };
    h.tables.track_answers = {
      data: [
        {
          value: "Texte privé",
          answer_types: { name: "Film" },
          custom_playlist_tracks: {
            track_id: "tb",
            custom_playlists: { owner_id: "autre", is_public: false },
          },
        },
      ],
    };
    const { suggestions } = await suggestWorks(getAdminClient(), PL, "moi");
    expect(suggestions[0].value).toBeNull();
  });

  it(`grosse playlist : passages de ${PAGE} titres, le suivant reprend où on s'est arrêté`, async () => {
    const rows = Array.from({ length: PAGE + 5 }, (_, i) => row(`r${i}`));
    h.tables.custom_playlist_tracks = (q) => {
      const [from, to] = q.args("range");
      return { data: rows.slice(from, to + 1) };
    };
    h.tables.track_answers = { data: [] };
    const first = await suggestWorks(getAdminClient(), PL, "moi");
    expect(h.deezer).toHaveBeenCalledTimes(PAGE);
    expect(first).toMatchObject({ next: PAGE, total: PAGE + 5 });
    expect(first.suggestions).toHaveLength(PAGE);
    const second = await suggestWorks(getAdminClient(), PL, "moi", PAGE);
    expect(second.suggestions.map((x) => x.id)[0]).toBe(`r${PAGE}`);
    expect(second).toMatchObject({ next: null, total: PAGE + 5 });
    expect(second.suggestions).toHaveLength(5);
  });
});

describe("saveWorks", () => {
  const inserts = () =>
    h.admin.of("track_answers").flatMap((q) => q.args("insert")?.[0] ?? []);

  it("n'écrit que sur les titres de la playlist encore sans œuvre, une fois", async () => {
    h.tables.custom_playlist_tracks = {
      data: [row("a", { track_answers: film("Vaiana") }), row("b")],
    };
    const n = await saveWorks(getAdminClient(), PL, [
      { id: "a", type_id: 3, value: "Autre" },
      { id: "b", type_id: 3, value: " Les Aristochats " },
      { id: "b", type_id: 4, value: "Doublon" },
      { id: "z", type_id: 3, value: "Pas dans la playlist" },
    ]);
    expect(n).toBe(1);
    expect(inserts()).toEqual([
      { track_id: "b", answer_type_id: 3, value: "Les Aristochats" },
    ]);
  });

  it("rien à écrire : aucune requête d'insertion", async () => {
    h.tables.custom_playlist_tracks = { data: [] };
    expect(
      await saveWorks(getAdminClient(), PL, [
        { id: "b", type_id: 3, value: "x" },
      ]),
    ).toBe(0);
    expect(h.admin.of("track_answers")).toEqual([]);
  });
});

describe("canEditPlaylist", () => {
  it("propriétaire : oui ; autre joueur : non ; super admin : oui ; inconnue : non", async () => {
    h.tables.custom_playlists = { data: { owner_id: "moi" } };
    h.tables.profiles = (q) => ({
      data: { role: q.has("eq", "id", "admin") ? "super_admin" : "user" },
    });
    expect(await canEditPlaylist(getAdminClient(), PL, "moi")).toBe(true);
    expect(await canEditPlaylist(getAdminClient(), PL, "autre")).toBe(false);
    expect(await canEditPlaylist(getAdminClient(), PL, "admin")).toBe(true);
    h.tables.custom_playlists = { data: null };
    expect(await canEditPlaylist(getAdminClient(), PL, "moi")).toBe(false);
  });
});
