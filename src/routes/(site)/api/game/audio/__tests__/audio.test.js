import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const m = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("$lib/server/socket/game/audio.js", () => ({
  refreshPreview: m.refresh,
}));

const { GET } = await import("../+server.js");
const { ytdlAudioCache, audioUrlFor } =
  await import("$lib/server/audio/ytdlCache.js");

const CLE = "prev_test";
const entree = (extra = {}) => ({
  url: "https://cdn/a.mp3",
  mimeType: "audio/mpeg",
  fetchedAt: Date.now(),
  query: { artist: "A", title: "T" },
  ...extra,
});
function appel(jeton = audioUrlFor(CLE).split("v=")[1]) {
  return GET({
    url: new URL(`https://zik.test/api/game/audio?v=${jeton}`),
    request: new Request("https://zik.test/"),
  });
}
const flux = (status = 200) =>
  new Response(status === 200 ? "son" : null, { status });

describe("/api/game/audio", () => {
  beforeEach(() => {
    ytdlAudioCache.clear();
    m.refresh.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("jeton inconnu : 404, sans appel réseau", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect((await appel("inconnu")).status).toBe(404);
    expect(f).not.toHaveBeenCalled();
  });

  it("jeton valide sans entrée en cache : 404", async () => {
    expect((await appel()).status).toBe(404);
  });

  it("sert l'extrait", async () => {
    ytdlAudioCache.set(CLE, entree());
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => flux()),
    );
    const res = await appel();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
  });

  it("extrait ancien sans expiration (iTunes) : toujours servi", async () => {
    ytdlAudioCache.set(
      CLE,
      entree({ fetchedAt: Date.now() - 3 * 3600 * 1000 }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => flux()),
    );
    expect((await appel()).status).toBe(200);
  });

  it("lien expiré (403) : rafraîchi, le joueur reçoit le son", async () => {
    ytdlAudioCache.set(CLE, entree());
    m.refresh.mockResolvedValue(entree({ url: "https://cdn/frais.mp3" }));
    const f = vi
      .fn()
      .mockResolvedValueOnce(flux(403))
      .mockResolvedValueOnce(flux());
    vi.stubGlobal("fetch", f);
    const res = await appel();
    expect(res.status).toBe(200);
    expect(m.refresh).toHaveBeenCalledWith(CLE, expect.anything());
    expect(f.mock.calls[1][0]).toBe("https://cdn/frais.mp3");
  });

  it("lien retiré (404) : rafraîchi aussi", async () => {
    ytdlAudioCache.set(CLE, entree());
    m.refresh.mockResolvedValue(entree({ url: "https://cdn/frais.mp3" }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(flux(404)).mockResolvedValueOnce(flux()),
    );
    expect((await appel()).status).toBe(200);
  });

  it("rafraîchissement en échec : 503 propre, entrée gardée", async () => {
    ytdlAudioCache.set(CLE, entree());
    m.refresh.mockRejectedValue(new Error("Aucun extrait"));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => flux(403)),
    );
    expect((await appel()).status).toBe(503);
    expect(ytdlAudioCache.has(CLE)).toBe(true);
  });

  it("réseau coupé vers le CDN : même chemin de rafraîchissement", async () => {
    ytdlAudioCache.set(CLE, entree());
    m.refresh.mockRejectedValue(new Error("Aucun extrait"));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("réseau");
      }),
    );
    expect((await appel()).status).toBe(503);
    expect(m.refresh).toHaveBeenCalledOnce();
  });
});
