import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  user: { id: "moi" },
  can: true,
  save: vi.fn(),
  suggest: vi.fn(),
}));
vi.mock("$lib/server/config.js", () => ({ getAdminClient: () => ({}) }));
vi.mock("$lib/server/middleware/auth.js", () => ({
  requireAuth: async () => ({ user: h.user }),
  checkRateLimit: () => {},
}));
vi.mock("$lib/server/services/music/workSuggest.js", () => ({
  WORK_TYPE_IDS: { Film: 3, Série: 4, "Jeu vidéo": 6, Animé: 7 },
  canEditPlaylist: async () => h.can,
  saveWorks: h.save,
  suggestWorks: h.suggest,
}));

const route =
  await import("../../../../../routes/(site)/api/playlists/[id]/films/+server.js");

const PL = "11111111-1111-1111-1111-111111111111";
const ID = "22222222-2222-2222-2222-222222222222";
const post = (body, id = PL) =>
  route.POST({
    params: { id },
    request: new Request("http://x", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  });

beforeEach(() => {
  h.can = true;
  h.save.mockReset().mockResolvedValue(1);
  h.suggest
    .mockReset()
    .mockResolvedValue({ suggestions: [], truncated: false });
});

describe("/api/playlists/[id]/films", () => {
  it("playlist d'un autre : refus, rien n'est lu ni écrit", async () => {
    h.can = false;
    const get = await route.GET({
      params: { id: PL },
      request: new Request("http://x"),
    });
    expect(get.status).toBe(403);
    expect((await post({ answers: [] })).status).toBe(403);
    expect(h.suggest).not.toHaveBeenCalled();
    expect(h.save).not.toHaveBeenCalled();
  });

  it("identifiant de playlist mal formé : refus", async () => {
    expect((await post({ answers: [] }, "1; drop table")).status).toBe(403);
  });

  it.each([
    ["corps illisible", "{pas du json"],
    ["sans tableau", { answers: "x" }],
    ["id pas uuid", { answers: [{ id: "x", type_id: 3, value: "a" }] }],
    [
      "type qui n'est pas une œuvre",
      { answers: [{ id: ID, type_id: 5, value: "a" }] },
    ],
    ["type en texte", { answers: [{ id: ID, type_id: "3", value: "a" }] }],
    ["valeur vide", { answers: [{ id: ID, type_id: 3, value: "   " }] }],
    [
      "valeur trop longue",
      { answers: [{ id: ID, type_id: 3, value: "a".repeat(121) }] },
    ],
    ["valeur objet", { answers: [{ id: ID, type_id: 3, value: { a: 1 } }] }],
    ["ligne nulle", { answers: [null] }],
    [
      "trop de lignes",
      { answers: Array(501).fill({ id: ID, type_id: 3, value: "a" }) },
    ],
  ])("%s : 400, rien n'est écrit", async (_, body) => {
    expect((await post(body)).status).toBe(400);
    expect(h.save).not.toHaveBeenCalled();
  });

  it("réponses valides : enregistrées", async () => {
    const answers = [{ id: ID, type_id: 3, value: "Les Aristochats" }];
    const res = await post({ answers });
    expect(await res.json()).toEqual({ saved: 1 });
    expect(h.save).toHaveBeenCalledWith({}, PL, answers);
  });
});
