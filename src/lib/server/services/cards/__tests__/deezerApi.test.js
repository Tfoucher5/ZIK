import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const deezerFetch = vi.hoisted(() => vi.fn());
vi.mock("../../music/deezerClient.js", () => ({ deezerFetch }));
vi.mock("../../music/spotify.js", () => ({
  getSpotifyToken: async () => "tok",
}));

const { deezer, firstReleaseFromIsrc, cached, spotifyIsrc, youtubeTitle } =
  await import("../deezerApi.js");

const reply = (body, ok = true) => ({ ok, json: async () => body });
let fetchMock;

beforeEach(() => {
  deezerFetch.mockReset();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("deezer", () => {
  it("appel de fond (bulk), renvoie les données", async () => {
    deezerFetch.mockResolvedValue({ id: 1 });
    expect(await deezer("/track/1")).toEqual({ id: 1 });
    expect(deezerFetch).toHaveBeenCalledWith("/track/1", {
      bulk: true,
      timeout: 10_000,
    });
  });

  it("erreur Deezer, réponse vide ou exception : null", async () => {
    deezerFetch.mockResolvedValueOnce({ error: { code: 4 } });
    expect(await deezer("/x")).toBeNull();
    deezerFetch.mockResolvedValueOnce(null);
    expect(await deezer("/x")).toBeNull();
    deezerFetch.mockRejectedValueOnce(new Error("quota"));
    expect(await deezer("/x")).toBeNull();
  });
});

describe("cached", () => {
  it("un seul appel par id, même en parallèle", async () => {
    deezerFetch.mockResolvedValue({ id: 5 });
    const cache = new Map();
    const [a, b] = await Promise.all([
      cached(cache, 5, "/album/5"),
      cached(cache, 5, "/album/5"),
    ]);
    expect(a).toEqual({ id: 5 });
    expect(b).toBe(a);
    expect(deezerFetch).toHaveBeenCalledTimes(1);
  });
});

describe("firstReleaseFromIsrc", () => {
  it("sans ISRC : null, aucun appel", async () => {
    expect(await firstReleaseFromIsrc(null)).toBeNull();
    expect(await firstReleaseFromIsrc("")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("plus ancienne date de sortie, en ignorant les vides, une requête par seconde", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(
      reply({
        recordings: [
          { "first-release-date": "1980-05-01" },
          {},
          { "first-release-date": "1975-10-31" },
          { "first-release-date": "" },
        ],
      }),
    );
    const first = firstReleaseFromIsrc("GB/123 4");
    await vi.advanceTimersByTimeAsync(1_100);
    expect(await first).toBe("1975-10-31");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://musicbrainz.org/ws/2/isrc/GB%2F123%204?fmt=json",
    );
    expect(fetchMock.mock.calls[0][1].headers["User-Agent"]).toMatch(/ZIK/);

    // Deux appels rapprochés : le second attend son créneau
    const a = firstReleaseFromIsrc("A");
    const b = firstReleaseFromIsrc("B");
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(100);
    await Promise.all([a, b]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("aucun enregistrement, réponse en erreur ou réseau coupé : null", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(reply({}))
      .mockResolvedValueOnce(reply({}, false))
      .mockRejectedValueOnce(new Error("ECONNRESET"));
    const all = Promise.all(["A", "B", "C"].map(firstReleaseFromIsrc));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await all).toEqual([null, null, null]);
  });
});

describe("spotifyIsrc", () => {
  it("lit external_ids.isrc avec le jeton", async () => {
    fetchMock.mockResolvedValue(reply({ external_ids: { isrc: "FR1" } }));
    expect(await spotifyIsrc("abc")).toBe("FR1");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.spotify.com/v1/tracks/abc",
    );
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer tok");
  });

  it("sans ISRC, réponse en erreur ou exception : null", async () => {
    fetchMock.mockResolvedValueOnce(reply({}));
    expect(await spotifyIsrc("a")).toBeNull();
    fetchMock.mockResolvedValueOnce(reply({}, false));
    expect(await spotifyIsrc("a")).toBeNull();
    fetchMock.mockRejectedValueOnce(new Error("x"));
    expect(await spotifyIsrc("a")).toBeNull();
  });
});

describe("youtubeTitle", () => {
  it("titre de la vidéo, précédé de l'artiste pour une chaîne « - Topic »", async () => {
    fetchMock.mockResolvedValueOnce(
      reply({ title: "Alors on danse", author_name: "Stromae - Topic" }),
    );
    expect(await youtubeTitle("dQw4w9WgXcQ")).toBe("Stromae - Alors on danse");
    expect(decodeURIComponent(fetchMock.mock.calls[0][0])).toContain(
      "watch?v=dQw4w9WgXcQ",
    );

    fetchMock.mockResolvedValueOnce(
      reply({ title: "Clip officiel", author_name: "StromaeVEVO" }),
    );
    expect(await youtubeTitle("x")).toBe("Clip officiel");

    fetchMock.mockResolvedValueOnce(reply({ title: "Sans auteur" }));
    expect(await youtubeTitle("x")).toBe("Sans auteur");
  });

  it("vidéo privée ou réseau coupé : null", async () => {
    fetchMock.mockResolvedValueOnce(reply({}, false));
    expect(await youtubeTitle("x")).toBeNull();
    fetchMock.mockRejectedValueOnce(new Error("x"));
    expect(await youtubeTitle("x")).toBeNull();
  });
});
