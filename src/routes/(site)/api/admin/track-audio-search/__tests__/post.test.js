import { describe, it, expect, vi, afterEach } from "vitest";

const dz = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("$lib/server/services/music/deezerClient.js", () => ({
  deezerFetch: dz.fetch,
}));
vi.mock("$lib/server/middleware/auth.js", () => ({
  verifyToken: async () => ({ id: "u" }),
}));
vi.mock("$lib/server/config.js", () => {
  const q = {
    select: () => q,
    eq: () => q,
    single: async () => ({ data: { role: "super_admin" } }),
  };
  return { getAdminClient: () => ({ from: () => q }) };
});

const { POST } = await import("../+server.js");

const chercher = async () =>
  (
    await POST({
      url: new URL("http://x/?token=t"),
      request: new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ query: "Stromae" }),
      }),
    })
  ).json();

afterEach(() => vi.unstubAllGlobals());

describe("POST /api/admin/track-audio-search", () => {
  it("quota Deezer atteint : erreur signalée, iTunes prend le relais", async () => {
    dz.fetch.mockResolvedValue({ error: { code: 4, message: "Quota" } });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ results: [{ previewUrl: "https://i/x.m4a" }] }),
      })),
    );
    const { results, errors } = await chercher();
    expect(dz.fetch.mock.calls[0][1]).toEqual({ timeout: 6000 });
    expect(errors).toEqual(["Deezer : Quota"]);
    expect(results.map((r) => r.source)).toEqual(["itunes"]);
  });
});
