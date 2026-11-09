import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let reponse;
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.parse("2026-11-09T12:00:00Z"));
  vi.stubEnv("SPOTIFY_CLIENT_ID", "id");
  vi.stubEnv("SPOTIFY_CLIENT_SECRET", "secret");
  reponse = {
    ok: true,
    status: 200,
    json: async () => ({ access_token: "tok1", expires_in: 3600 }),
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => reponse),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const load = () => import("../spotify.js");

describe("getSpotifyToken", () => {
  it("demande un jeton client_credentials en Basic", async () => {
    const { getSpotifyToken } = await load();
    expect(await getSpotifyToken()).toBe("tok1");
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe("https://accounts.spotify.com/api/token");
    expect(opts.headers.Authorization).toBe(
      `Basic ${Buffer.from("id:secret").toString("base64")}`,
    );
    expect(opts.body).toBe("grant_type=client_credentials");
  });
  it("jeton réutilisé jusqu'à 60 s avant son expiration", async () => {
    const { getSpotifyToken } = await load();
    await getSpotifyToken();
    vi.advanceTimersByTime(3539_000);
    await getSpotifyToken();
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1_000);
    await getSpotifyToken();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("non configuré : erreur, aucun appel", async () => {
    vi.stubEnv("SPOTIFY_CLIENT_SECRET", "");
    const { getSpotifyToken } = await load();
    await expect(getSpotifyToken()).rejects.toThrow("Spotify non configure");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("refus HTTP : erreur avec le code", async () => {
    reponse = { ok: false, status: 401 };
    const { getSpotifyToken } = await load();
    await expect(getSpotifyToken()).rejects.toThrow("Spotify Auth Error 401");
  });
});

describe("normalizeSpotifyItem", () => {
  const item = (track, o = {}) => ({ track, ...o });
  const t = (o = {}) => ({
    id: "sp1",
    type: "track",
    name: "Mopa",
    artists: [{ name: "Gazo" }],
    preview_url: "https://p",
    album: { images: [{ url: "640.jpg" }, { url: "300.jpg" }] },
    ...o,
  });
  it("titre simple : pochette moyenne", async () => {
    const { normalizeSpotifyItem } = await load();
    expect(normalizeSpotifyItem(item(t()))).toEqual({
      external_id: "sp1",
      source: "spotify",
      artist: "Gazo",
      title: "Mopa",
      preview_url: "https://p",
      cover_url: "300.jpg",
    });
  });
  it("plusieurs artistes : featuring ; format item de l'API récente", async () => {
    const { normalizeSpotifyItem } = await load();
    const r = normalizeSpotifyItem({
      item: t({
        artists: [{ name: "Gazo" }, { name: "Tiakola" }, { name: "X" }],
        album: { images: [{ url: "640.jpg" }] },
        preview_url: null,
      }),
    });
    expect(r).toMatchObject({
      artist: "Gazo (feat. Tiakola, X)",
      cover_url: "640.jpg",
      preview_url: null,
    });
  });
  it("sans artiste ni pochette", async () => {
    const { normalizeSpotifyItem } = await load();
    expect(
      normalizeSpotifyItem(item(t({ artists: [], album: undefined }))),
    ).toMatchObject({ artist: "?", cover_url: null });
  });
  it.each([
    ["épisode de podcast", item(t({ type: "episode" }))],
    ["fichier local", item(t(), { is_local: true })],
    ["sans id", item(t({ id: null }))],
    ["sans titre", {}],
    ["null", null],
  ])("écarté : %s", async (_, i) => {
    const { normalizeSpotifyItem } = await load();
    expect(normalizeSpotifyItem(i)).toBeNull();
  });
});
