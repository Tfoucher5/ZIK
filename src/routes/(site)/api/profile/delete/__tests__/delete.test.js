import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ verify: vi.fn(), deleteUser: vi.fn() }));

vi.mock("$lib/server/middleware/auth.js", () => ({ verifyToken: m.verify }));
vi.mock("$lib/server/config.js", () => ({
  getAdminClient: () => ({ auth: { admin: { deleteUser: m.deleteUser } } }),
}));

const { DELETE } = await import("../+server.js");

const appel = (auth) =>
  DELETE({
    request: new Request("http://x/api/profile/delete", {
      method: "DELETE",
      headers: auth ? { authorization: auth } : {},
    }),
  });

describe("DELETE /api/profile/delete", () => {
  beforeEach(() => {
    m.verify.mockReset().mockResolvedValue({ id: "u1" });
    m.deleteUser.mockReset().mockResolvedValue({ error: null });
  });

  it("supprime le compte auth, dont partent en cascade profil et playlists", async () => {
    const res = await appel("Bearer t");
    expect(res.status).toBe(200);
    expect(m.deleteUser).toHaveBeenCalledWith("u1");
  });

  it("sans jeton ou jeton invalide : 401, rien supprimé", async () => {
    expect((await appel()).status).toBe(401);
    m.verify.mockResolvedValue(null);
    expect((await appel("Bearer faux")).status).toBe(401);
    expect(m.deleteUser).not.toHaveBeenCalled();
  });

  it("échec de suppression : 500 sans faire croire que les données sont parties", async () => {
    m.deleteUser.mockResolvedValue({ error: { message: "fk" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await appel("Bearer t");
    expect(res.status).toBe(500);
    expect((await res.json()).partial).toBeUndefined();
  });
});
