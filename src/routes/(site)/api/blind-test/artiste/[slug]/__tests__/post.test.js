import { describe, it, expect, vi } from "vitest";

const svc = vi.hoisted(() => ({ find: vi.fn(), start: vi.fn() }));
vi.mock("$lib/server/services/music/artistPages.js", () => ({
  findArtist: svc.find,
  startArtistRoom: svc.start,
}));
vi.mock("$lib/server/middleware/auth.js", () => ({ checkRateLimit() {} }));

const { POST } = await import("../+server.js");
const lancer = () =>
  POST({ params: { slug: "queen" }, request: new Request("http://x") });

describe("POST /api/blind-test/artiste/[slug]", () => {
  it("room créée : son code est rendu", async () => {
    svc.find.mockResolvedValue({ name: "Queen" });
    svc.start.mockResolvedValue("ABCD");
    expect(await (await lancer()).json()).toEqual({ code: "ABCD" });
  });

  it("artiste inconnu : 404", async () => {
    svc.find.mockResolvedValue(null);
    await expect(lancer()).rejects.toMatchObject({ status: 404 });
  });

  it("plus assez de titres : 409 clair, pas d'erreur 500", async () => {
    svc.find.mockResolvedValue({ name: "Queen" });
    svc.start.mockResolvedValue(null);
    await expect(lancer()).rejects.toMatchObject({
      status: 409,
      body: { message: "Pas assez de titres pour cet artiste" },
    });
  });
});
