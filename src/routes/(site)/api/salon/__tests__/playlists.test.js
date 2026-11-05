import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ create: vi.fn(), change: vi.fn() }));

vi.mock("$lib/server/socket/salon/index.js", () => ({
  createSalonRoom: m.create,
  changeSalonPlaylists: m.change,
}));
vi.mock("$lib/server/socket/salon/snapshot.js", () => ({
  restoreSalon: async () => null,
}));
vi.mock("$lib/server/middleware/auth.js", () => ({
  verifyToken: async () => null,
}));

const { POST, PATCH } = await import("../+server.js");

const uuid = (i) => `${1e7 + i}-0000-0000-0000-000000000000`;
const ids = (n) => Array.from({ length: n }, (_, i) => uuid(i));
const requete = (method, body) => ({
  request: new Request("http://x/api/salon", {
    method,
    body: JSON.stringify(body),
  }),
});
const creer = (playlistIds) => POST(requete("POST", { playlistIds }));
const changer = (playlistIds) =>
  PATCH(requete("PATCH", { code: "ABC", key: "k", playlistIds }));

describe.each([
  ["POST", creer, m.create],
  ["PATCH", changer, m.change],
])("%s /api/salon : playlists reçues", (_, appel, service) => {
  beforeEach(() => {
    m.create.mockReset().mockResolvedValue({ code: "ABC", key: "k" });
    m.change.mockReset().mockResolvedValue({ trackCount: 3 });
  });

  it("50 playlists : acceptées", async () => {
    expect((await appel(ids(50))).status).toBe(200);
    expect(service).toHaveBeenCalledOnce();
  });

  it.each([
    ["trop de playlists", ids(51)],
    ["liste vide", []],
    ["pas une liste", "abc"],
    ["absente", undefined],
    ["id invalide", [uuid(1), "pas-un-uuid"]],
    ["id non texte", [42]],
    ["objet à la place d'un id", [{ id: uuid(1) }]],
  ])("%s : refusé, aucune requête en base", async (_, valeur) => {
    expect((await appel(valeur)).status).toBe(400);
    expect(service).not.toHaveBeenCalled();
  });
});
