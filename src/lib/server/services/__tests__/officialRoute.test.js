import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ user: null }));
vi.mock("$lib/server/config.js", async () => {
  const { fakeClients } = await import("./fakeQuery.js");
  return fakeClients(h);
});
vi.mock("$lib/server/middleware/auth.js", () => ({
  verifyToken: async () => h.user,
}));

const route =
  await import("../../../../routes/(site)/api/playlists/[id]/official/+server.js");

const post = (body = { is_official: true, linked_room_id: "R1" }) =>
  route.POST({
    params: { id: "P1" },
    request: new Request("http://x", {
      method: "POST",
      headers: { authorization: "Bearer t" },
      body: JSON.stringify(body),
    }),
  });

beforeEach(() => {
  h.reset();
  h.user = { id: "u1" };
});

describe("/api/playlists/[id]/official", () => {
  it("super-admin : écrit par le client serveur", async () => {
    h.tables.profiles = { data: { role: "super_admin" } };
    const res = await post();
    expect(res.status).toBe(200);
    const [w] = h.writes(h.admin);
    expect(w.table).toBe("custom_playlists");
    expect(w.has("update")).toBe(true);
    expect(h.writes(h.anon)).toHaveLength(0);
  });

  it("joueur ordinaire : refusé, aucune écriture", async () => {
    h.tables.profiles = { data: { role: "user" } };
    expect((await post()).status).toBe(403);
    expect(h.writes(h.admin)).toHaveLength(0);
  });
});
