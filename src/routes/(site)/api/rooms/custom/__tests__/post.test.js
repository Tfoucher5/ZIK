import { describe, it, expect, vi, beforeEach } from "vitest";

const room = vi.hoisted(() => ({ create: vi.fn(() => "ABCD") }));
vi.mock("$lib/server/services/rooms/customRoom.js", () => ({
  createCustomRoom: room.create,
}));
vi.mock("$lib/server/middleware/auth.js", () => ({ checkRateLimit() {} }));

const { POST } = await import("../+server.js");

const titre = (artist, title) => ({ artist, title });
const creer = async (body) => {
  const res = await POST({
    request: new Request("http://x", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  });
  return { status: res.status, body: await res.json() };
};

beforeEach(() => room.create.mockClear());

describe("POST /api/rooms/custom", () => {
  it("3 titres dont un sans artiste : refusé, aucune room", async () => {
    const r = await creer({
      name: "Ma room",
      tracks: [titre("A", "1"), titre("B", "2"), titre("", "3")],
    });
    expect(r.status).toBe(400);
    expect(room.create).not.toHaveBeenCalled();
  });

  it("3 titres jouables : room créée avec eux seuls", async () => {
    const r = await creer({
      name: "Ma room",
      tracks: [
        titre("A", "1"),
        titre("B", "2"),
        titre("C", "3"),
        titre("D", ""),
      ],
    });
    expect(r.body).toEqual({ code: "ABCD" });
    expect(room.create.mock.calls[0][0].tracks).toHaveLength(3);
  });

  it.each([{}, { name: " ", tracks: [] }, { name: "R", tracks: "x" }])(
    "entrée invalide %j : refusée",
    async (body) => {
      expect((await creer(body)).status).toBe(400);
    },
  );
});
