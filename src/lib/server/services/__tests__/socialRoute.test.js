import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ viewer: null }));
vi.mock("$lib/server/config.js", async () => {
  const { fakeClients } = await import("./fakeQuery.js");
  return fakeClients(h);
});
vi.mock("$lib/server/middleware/auth.js", () => ({
  verifyToken: async () => h.viewer,
}));

const route =
  await import("../../../../routes/(site)/api/social/[userId]/+server.js");

const U = "moi";
const p = (id, elo = 1000) => ({ id, username: id, elo });
const ami = (a, b) => ({
  requester_id: a,
  addressee_id: b,
  status: "accepted",
  requester: p(a),
  addressee: p(b),
});
const demande = (a, b) => ({ ...ami(a, b), status: "pending" });

const get = async (token) =>
  (
    await route.GET({
      params: { userId: U },
      request: new Request("http://x", {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      }),
    })
  ).json();

beforeEach(() => {
  h.reset();
  h.viewer = null;
  h.tables.follows = (q) =>
    q.has("eq", "follower_id", U)
      ? { data: [{ following_id: "a" }, { following_id: "b" }] }
      : { data: [{ follower_id: "c" }] };
  h.tables.friendships = { data: [] };
});

describe("/api/social/[userId]", () => {
  it("profils lus par lien embarqué, plus aucune requête vers profiles", async () => {
    await get();
    const [q] = h.anon.of("friendships");
    expect(q.schema).toBe("social");
    expect(q.args("select")[0]).toMatch(/requester\(id, username[^)]*elo/);
    expect(q.args("select")[0]).toMatch(/addressee\(id, username[^)]*elo/);
    expect(h.all().some((x) => x.table === "profiles")).toBe(false);
  });

  it("amis : profil de l'autre extrémité, elo décroissant, profil supprimé ignoré", async () => {
    h.tables.friendships = {
      data: [
        { ...ami(U, "x"), addressee: p("x", 900) },
        { ...ami("y", U), requester: p("y", 1500) },
        { ...ami(U, "z"), addressee: null },
        { ...ami("w", U), requester: { id: "w", username: "w" } },
      ],
    };
    const r = await get();
    expect(r.friends.map((f) => f.id)).toEqual(["y", "x", "w"]);
    expect(r.friendsCount).toBe(4);
    expect(r.followers).toBe(1);
    expect(r.following).toBe(2);
  });

  it("amis : 20 au plus, les meilleurs elo", async () => {
    h.tables.friendships = {
      data: Array.from({ length: 25 }, (_, i) => ({
        ...ami(U, `f${i}`),
        addressee: p(`f${i}`, i),
      })),
    };
    const r = await get();
    expect(r.friends).toHaveLength(20);
    expect(r.friends[0].id).toBe("f24");
    expect(r.friends.at(-1).id).toBe("f5");
    expect(r.friendsCount).toBe(25);
  });

  it("demandes reçues : visibles du seul propriétaire, compte toujours donné", async () => {
    h.tables.friendships = {
      data: [demande("a", U), demande("b", U), demande(U, "c")],
    };
    const anonyme = await get();
    expect(anonyme.pendingRequests).toEqual([]);
    expect(anonyme.pendingCount).toBe(2);

    h.viewer = { id: "intrus" };
    expect((await get("t")).pendingRequests).toEqual([]);

    h.viewer = { id: U };
    const own = await get("t");
    expect(own.pendingRequests.map((x) => x.id)).toEqual(["a", "b"]);
    expect(own.pendingCount).toBe(2);
    expect(own.friendStatus).toBe("none");
    expect(own.viewerFollows).toBe(false);
  });

  it("demandes reçues : profil supprimé ignoré, 20 au plus", async () => {
    h.viewer = { id: U };
    h.tables.friendships = {
      data: [
        { ...demande("a", U), requester: null },
        ...Array.from({ length: 22 }, (_, i) => demande(`d${i}`, U)),
      ],
    };
    const r = await get("t");
    expect(r.pendingRequests).toHaveLength(20);
    expect(r.pendingRequests[0].id).toBe("d0");
    expect(r.pendingCount).toBe(23);
  });

  it("token invalide : vu comme anonyme", async () => {
    h.tables.friendships = { data: [demande("a", U)] };
    const r = await get("faux");
    expect(r.pendingRequests).toEqual([]);
    expect(r.friendStatus).toBe("none");
  });

  it.each([
    ["friends", [ami("v", U)], true],
    ["friends", [ami(U, "v")], true],
    ["pending_out", [demande("v", U)], false],
    ["pending_in", [demande(U, "v")], false],
    ["none", [demande("a", U), ami(U, "b")], false],
  ])("friendStatus %s", async (status, data, isFriend) => {
    h.tables.friendships = { data };
    h.viewer = { id: "v" };
    const r = await get("t");
    expect(r.friendStatus).toBe(status);
    expect(r.isFriend).toBe(isFriend);
  });

  it("viewerFollows / followsViewer selon les suivis", async () => {
    h.viewer = { id: "c" };
    expect(await get("t")).toMatchObject({
      viewerFollows: true,
      followsViewer: false,
    });
    h.viewer = { id: "a" };
    expect(await get("t")).toMatchObject({
      viewerFollows: false,
      followsViewer: true,
    });
  });

  it.each(["follows", "friendships"])(
    "erreur de lecture de %s : état vide",
    async (table) => {
      h.tables.friendships = { data: [ami(U, "x")] };
      const avant = h.tables[table];
      h.tables[table] = (q) => ({
        ...(typeof avant === "function" ? avant(q) : avant),
        error: { message: "boom" },
      });
      expect(await get()).toMatchObject({
        followers: 0,
        following: 0,
        friendsCount: 0,
        friends: [],
        friendStatus: "none",
        pendingRequests: [],
        pendingCount: 0,
      });
    },
  );

  it("exception pendant la lecture : état vide", async () => {
    h.tables.friendships = () => {
      throw new Error("réseau");
    };
    const r = await get();
    expect(r.friends).toEqual([]);
    expect(r.friendStatus).toBe("none");
  });
});
