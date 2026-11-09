import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeQuery } from "../../__tests__/fakeQuery.js";

const m = vi.hoisted(() => ({ db: null }));
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => m.db.client,
}));

const { playlistCache, dbRooms } = await import("../../../state.js");
const { forgetPlaylists, loadAnswerTypes, addAnswers, removeAnswers } =
  await import("../contenu.js");
const { fetchAllRows } = await import("../paginate.js");

let rows;
const reset = (o) => {
  for (const k of Object.keys(o)) delete o[k];
};

beforeEach(() => {
  rows = {};
  m.db = fakeQuery((q) => rows[q.table]?.(q));
  reset(playlistCache);
  reset(dbRooms);
});

describe("cache des playlists", () => {
  it("oublie les rooms liées, par lien, par playlist_id ou par room liée", async () => {
    Object.assign(dbRooms, {
      ROCK: { id: 1 },
      POP: { id: 2, playlist_id: 20 },
      RAP: { id: 3, playlist_id: 99 },
    });
    Object.assign(playlistCache, { ROCK: [1], POP: [2], RAP: [3], PERSO: [4] });
    rows.room_playlists = () => ({ data: [{ room_id: 1 }] });
    rows.custom_playlists = () => ({ data: [{ linked_room_id: "PERSO" }] });
    await forgetPlaylists([10, 20]);
    expect(Object.keys(playlistCache)).toEqual(["RAP"]);
  });

  it("liste vide : aucune requête", async () => {
    await forgetPlaylists([]);
    expect(m.db.queries).toHaveLength(0);
  });

  it("lectures en échec : pas de plantage, rien n'est oublié à tort", async () => {
    dbRooms.ROCK = { id: 1 };
    playlistCache.ROCK = [1];
    const error = { message: "panne" };
    rows.room_playlists = () => ({ data: null, error });
    rows.custom_playlists = () => ({ data: null, error });
    await expect(forgetPlaylists([5])).resolves.toBeUndefined();
    expect(playlistCache.ROCK).toEqual([1]);
    expect(m.db.of("room_playlists")[0].args("in")).toEqual([
      "playlist_id",
      [5],
    ]);
  });
});

describe("réponses alternatives", () => {
  it("types de réponse : liste vide si la base ne répond rien", async () => {
    expect(await loadAnswerTypes()).toEqual([]);
    rows.answer_types = () => ({ data: [{ id: 1, name: "Artiste" }] });
    expect(await loadAnswerTypes()).toEqual([{ id: 1, name: "Artiste" }]);
  });

  it.each([
    [[], 1, "x"],
    [[1], 1, "   "],
    [[1], 1, null],
    [[1], "abc", "x"],
    [[1], 1.5, "x"],
    [[1], undefined, "x"],
  ])(
    "entrée invalide (%#) : message, aucune écriture",
    async (ids, type, value) => {
      expect(await addAnswers(ids, type, value)).toBe(
        "Choisis un type et écris la réponse.",
      );
      expect(m.db.queries).toHaveLength(0);
    },
  );

  it("n'ajoute que là où la réponse manque (casse ignorée) puis vide le cache", async () => {
    rows.track_answers = (q) =>
      q.has("insert")
        ? undefined
        : { data: [{ track_id: 1, value: "DAFT punk" }] };
    rows.custom_playlist_tracks = () => ({
      data: [{ playlist_id: 7 }, { playlist_id: 7 }],
    });
    expect(await addAnswers([1, 2], "3", "  Daft Punk ")).toBeNull();
    const insert = m.db.of("track_answers").find((q) => q.has("insert"));
    expect(insert.args("insert")).toEqual([
      [{ track_id: 2, answer_type_id: 3, value: "Daft Punk" }],
    ]);
    expect(m.db.of("room_playlists")[0].args("in")).toEqual([
      "playlist_id",
      [7],
    ]);
  });

  it("déjà acceptée partout : pas de doublon", async () => {
    rows.track_answers = () => ({ data: [{ track_id: 1, value: "x" }] });
    expect(await addAnswers([1], 1, "X")).toBe(
      "Cette réponse est déjà acceptée.",
    );
    expect(m.db.of("track_answers").some((q) => q.has("insert"))).toBe(false);
  });

  it("insertion refusée : message de la base, cache intact", async () => {
    rows.track_answers = (q) =>
      q.has("insert") ? { error: { message: "fk" } } : { data: [] };
    expect(await addAnswers([1], 1, "x")).toBe("fk");
    expect(m.db.of("custom_playlist_tracks")).toHaveLength(0);
  });

  it("suppression : rend la valeur et vide le cache des playlists touchées", async () => {
    rows.track_answers = () => ({
      data: [
        { value: "a", custom_playlist_tracks: { playlist_id: 4 } },
        { value: "b", custom_playlist_tracks: null },
      ],
    });
    expect(await removeAnswers([1, 2])).toEqual({ value: "a" });
    expect(m.db.of("room_playlists")[0].args("in")).toEqual([
      "playlist_id",
      [4],
    ]);
  });

  it("suppression refusée : erreur rendue", async () => {
    rows.track_answers = () => ({ error: { message: "rls" } });
    expect(await removeAnswers([1])).toEqual({ error: "rls" });
  });
});

describe("lecture par pages", () => {
  const pages = (sizes) => {
    const ranges = [];
    const build = () => ({
      range: async (from, to) => {
        ranges.push([from, to]);
        const n = sizes[ranges.length - 1];
        return n instanceof Error
          ? { error: n }
          : { data: n === null ? null : Array(n).fill(0) };
      },
    });
    return { build, ranges };
  };

  it("enchaîne les pages de 1000 jusqu'à une page incomplète", async () => {
    const p = pages([1000, 1000, 3]);
    expect(await fetchAllRows(p.build)).toHaveLength(2003);
    expect(p.ranges).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("page pleine puis vide, ou données nulles : s'arrête", async () => {
    expect(await fetchAllRows(pages([1000, 0]).build)).toHaveLength(1000);
    expect(await fetchAllRows(pages([null]).build)).toEqual([]);
  });

  it("erreur : remontée à l'appelant", async () => {
    const err = new Error("panne");
    await expect(fetchAllRows(pages([1000, err]).build)).rejects.toBe(err);
  });
});
