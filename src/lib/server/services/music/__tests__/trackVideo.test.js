import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resetFake } from "../../__tests__/fakeSupabase.js";

const h = vi.hoisted(() => ({ cands: vi.fn(), info: vi.fn() }));
vi.mock("../../../config.js", async () => {
  const { fakeClient } = await import("../../__tests__/fakeSupabase.js");
  const c = fakeClient(h);
  return { supabase: c, getAdminClient: () => c };
});
vi.mock("../../../socket/game/audio.js", () => ({
  ytsCandidates: h.cands,
  ytVideoInfo: h.info,
}));

const { listVersions, checkVideo, pinVideoIfEmpty } =
  await import("../trackVideo.js");

const ID = "dQw4w9WgXcQ";
const v = (id, title = "Clip") => ({
  id,
  title,
  channel: { name: "Chaîne" },
  duration: 212_400,
});

beforeEach(() => {
  resetFake(h);
  h.cands.mockReset();
  h.info.mockReset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.parse("2026-11-09T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("listVersions", () => {
  it("vidéo déjà fixée au catalogue : verrouillé, sans recherche", async () => {
    h.tables.tracks = { data: { id: "t1", youtube_id: ID } };
    expect(await listVersions(" Daft Punk ", "One More Time ")).toEqual({
      locked: true,
      trackId: "t1",
      video: { id: ID },
    });
    expect(h.calls[0].has("eq", "norm_key", "daft punk|one more time")).toBe(
      true,
    );
    expect(h.cands).not.toHaveBeenCalled();
  });

  it("candidats YouTube : durée en secondes, vidéo choisie, cache 10 min", async () => {
    h.tables.tracks = { data: { id: "t1", youtube_id: null } };
    h.cands.mockResolvedValue({ results: [v("a"), v("b")], autoIndex: 1 });
    const r = await listVersions("A", "Titre unique 1");
    expect(r).toEqual({
      locked: false,
      candidates: [
        { id: "a", title: "Clip", channel: "Chaîne", duration: 212 },
        { id: "b", title: "Clip", channel: "Chaîne", duration: 212 },
      ],
      autoId: "b",
    });
    await listVersions("a", "titre unique 1");
    expect(h.cands).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10 * 60_000 + 1);
    await listVersions("A", "Titre unique 1");
    expect(h.cands).toHaveBeenCalledTimes(2);
  });

  it("aucun résultat : pas mis en cache, autoId null", async () => {
    h.cands.mockResolvedValue({ results: [], autoIndex: -1 });
    expect(await listVersions("A", "Titre unique 2")).toEqual({
      locked: false,
      candidates: [],
      autoId: null,
    });
    await listVersions("A", "Titre unique 2");
    expect(h.cands).toHaveBeenCalledTimes(2);
  });
});

describe("checkVideo", () => {
  it("lien valide et vidéo existante : son id", async () => {
    h.info.mockResolvedValue({ id: ID });
    expect(await checkVideo(`https://youtu.be/${ID}`)).toBe(ID);
    expect(h.info).toHaveBeenCalledWith(ID);
  });
  it.each([
    null,
    42,
    "pas un lien",
    "https://exemple.fr/watch?v=" + ID,
    "x".repeat(1_000_000),
  ])("entrée invalide %# : null sans appel", async (input) => {
    expect(await checkVideo(input)).toBeNull();
    expect(h.info).not.toHaveBeenCalled();
  });
  it("vidéo introuvable ou erreur : null", async () => {
    h.info.mockResolvedValue(null);
    expect(await checkVideo(ID)).toBeNull();
    h.info.mockRejectedValue(new Error("404"));
    expect(await checkVideo(ID)).toBeNull();
  });
});

describe("pinVideoIfEmpty", () => {
  it("fixe seulement si aucune vidéo n'est déjà choisie", async () => {
    h.tables.tracks = { data: [{ id: "t1" }], error: null };
    expect(await pinVideoIfEmpty("t1", ID)).toBe(true);
    const q = h.calls[0];
    expect(
      q.has("update") &&
        q.has("eq", "id", "t1") &&
        q.has("is", "youtube_id", null),
    ).toBe(true);
  });
  it("déjà prise par un autre joueur : false", async () => {
    h.tables.tracks = { data: [], error: null };
    expect(await pinVideoIfEmpty("t1", ID)).toBe(false);
  });
  it("erreur de base : levée", async () => {
    h.tables.tracks = { data: null, error: { message: "refus" } };
    await expect(pinVideoIfEmpty("t1", ID)).rejects.toThrow("refus");
  });
});
