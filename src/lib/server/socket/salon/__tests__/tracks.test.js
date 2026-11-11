import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({}));
vi.mock("../../../config.js", async () =>
  (await import("../../../services/__tests__/fakeQuery.js")).fakeClients(h),
);

const { loadSalonTracks } = await import("../tracks.js");

const row = (i, answers = []) => ({
  created_at: "2026-01-01",
  track_answers: answers,
  tracks: { id: `t${i}`, artist: `Artiste ${i}`, title: `Titre ${i}` },
});

beforeEach(() => h.reset());

describe("loadSalonTracks", () => {
  // Soirée sur plusieurs playlists : la chanson Disney est aussi dans une
  // playlist sans réponse, le film doit rester à trouver
  it("doublon : la copie avec la réponse Film l'emporte", async () => {
    const film = row(1, [{ value: "Vaiana", answer_types: { name: "Film" } }]);
    h.tables.custom_playlist_tracks = (q) => ({
      data: q.has("eq", "playlist_id", "p1") ? [row(1), row(2)] : [film],
    });
    const tracks = await loadSalonTracks(["p1", "p2"]);
    expect(tracks.map((t) => t.id).sort()).toEqual(["t1", "t2"]);
    const t1 = tracks.find((t) => t.id === "t1");
    expect(t1.extraAnswers.map((e) => e.value)).toEqual(["Vaiana"]);
    expect(t1.playlistId).toBe("p2");
  });

  // Une grosse playlist de soirée ne doit pas être coupée à 1000 titres
  it("plus de 1000 lignes : tout est lu, page par page", async () => {
    const all = Array.from({ length: 1002 }, (_, i) => row(i));
    h.tables.custom_playlist_tracks = (q) => {
      const [from, to] = q.args("range");
      return { data: all.slice(from, to + 1) };
    };
    expect(await loadSalonTracks(["p1"])).toHaveLength(1002);
    expect(
      h.anon.queries.filter((q) => q.table === "custom_playlist_tracks"),
    ).toHaveLength(2);
  });
});
