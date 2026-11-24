import { describe, it, expect, vi, afterEach } from "vitest";

const auth = vi.hoisted(() => ({ role: null }));
vi.mock("#lib/server/services/music/spotify.js", () => ({
  getSpotifyToken: async () => "cle-serveur",
}));
vi.mock("#lib/server/config.js", () => {
  const q = {
    select: () => q,
    eq: () => q,
    single: async () => ({ data: auth.role ? { role: auth.role } : null }),
  };
  return {
    supabase: {
      auth: {
        getUser: async (t) => ({
          data: { user: t === "ok" ? { id: "u" } : null },
          error: null,
        }),
      },
    },
    getAdminClient: () => ({ from: () => q }),
  };
});
vi.mock("#lib/server/services/admin/alerts.js", () => ({
  alertAdminsSafe: () => {},
}));

const { GET } = await import("../+server.js");

let ip = 0;
const appel = (authorization) =>
  GET({
    url: new URL("http://x/?q=stromae"),
    request: new Request("http://x", {
      headers: {
        "x-forwarded-for": `10.0.0.${++ip}`,
        ...(authorization ? { authorization } : {}),
      },
    }),
  });

afterEach(() => vi.unstubAllGlobals());

describe("GET /api/spotify/search", () => {
  it("sans jeton : refusé, Spotify jamais appelé", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    await expect(appel()).rejects.toMatchObject({ status: 403 });
    expect(f).not.toHaveBeenCalled();
  });

  it("joueur connecté non admin : refusé", async () => {
    auth.role = "user";
    vi.stubGlobal("fetch", vi.fn());
    await expect(appel("Bearer ok")).rejects.toMatchObject({ status: 403 });
  });

  it("admin : la recherche passe", async () => {
    auth.role = "super_admin";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ json: async () => ({ tracks: { items: [] } }) })),
    );
    const r = await appel("Bearer ok");
    expect(r.status).toBe(200);
  });
});
