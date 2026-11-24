import { describe, it, expect, beforeEach, vi } from "vitest";
import { deezerIdOf } from "#lib/shared/playlist/deezerId.js";

const m = vi.hoisted(() => ({ patch: null }));

vi.mock("#lib/server/middleware/auth.js", () => ({
  verifyToken: async () => ({ id: "admin-1" }),
}));
vi.mock("#lib/server/config.js", () => {
  const sb = {
    schema: () => sb,
    from: (t) =>
      t === "profiles"
        ? {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { role: "super_admin" } }),
              }),
            }),
          }
        : {
            update: (p) => {
              m.patch = p;
              return { eq: async () => ({ error: null }) };
            },
          },
  };
  return { getAdminClient: () => sb };
});

const { POST } = await import("../+server.js");
const envoi = (body) =>
  POST({
    url: new URL("http://x/api/admin/track-audio-fix?token=t"),
    request: new Request("http://x", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  });

describe("réparation audio de l'admin et identifiant Deezer", () => {
  beforeEach(() => (m.patch = null));

  it("nouvel id Deezer choisi : il remplace l'identifiant complété", async () => {
    await envoi({
      trackId: "a",
      previewUrl: "https://cdn/p.mp3",
      externalId: "77",
    });
    expect(m.patch).toMatchObject({ external_id: "77", deezer_id: "77" });
    expect(m.patch.deezer_checked_at).toBeTruthy();
    expect(deezerIdOf({ ...m.patch, deezer_id: m.patch.deezer_id })).toBe("77");
  });

  it("extrait sans id Deezer (iTunes) : l'ancien id complété est retiré", async () => {
    await envoi({ trackId: "a", previewUrl: "https://itunes/p.m4a" });
    expect(m.patch.deezer_id).toBeNull();
    expect(m.patch.deezer_checked_at).toBeTruthy();
  });

  it("vidéo seule : identifiant Deezer inchangé", async () => {
    await envoi({ trackId: "a", youtubeId: "yt" });
    expect(m.patch).toEqual({ youtube_id: "yt" });
  });
});
