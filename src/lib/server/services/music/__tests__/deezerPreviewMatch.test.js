import { describe, it, expect, vi, afterEach } from "vitest";
import {
  deezerPreviewMatch,
  iTunesPreviewMatch,
  fetchDeezerTrackPreview,
  iTunesPreviewSearch,
  parseExpFromUrl,
} from "../deezer.js";

const reponse = (data) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({ data }) })),
  );
const r = (artist, title, preview = "https://cdn/x.mp3") => ({
  artist: { name: artist },
  title_short: title,
  preview,
});

describe("extrait Deezer trouvé par nom", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("garde le résultat dont l'artiste et le titre correspondent", async () => {
    reponse([
      r("Karaoké Stars", "Papaoutai", "https://cdn/faux.mp3"),
      r("Stromae", "Papaoutai", "https://cdn/bon.mp3"),
    ]);
    expect(await deezerPreviewMatch("Stromae", "Papaoutai")).toBe(
      "https://cdn/bon.mp3",
    );
  });

  it("insensible à la casse et aux accents", async () => {
    reponse([r("ANGÈLE", "démons")]);
    expect(await deezerPreviewMatch("Angele", "Demons")).toBe(
      "https://cdn/x.mp3",
    );
  });

  it.each([
    [
      "Queen",
      "Bohemian Rhapsody - Remastered 2011",
      "Queen",
      "Bohemian Rhapsody",
    ],
    [
      "Céline Dion",
      "Pour que tu m\u2019aimes encore",
      "Céline Dion",
      "Pour que tu m'aimes encore",
    ],
    [
      "The Black Eyed Peas",
      "Where Is The Love?",
      "Black Eyed Peas",
      "Where Is The Love?",
    ],
    ["Daft Punk", "Get Lucky", "Daft Punk feat. Pharrell", "Get Lucky"],
  ])(
    "écritures différentes d'un même titre : %s, %s",
    async (a, t, autreA, autreT) => {
      reponse([r(autreA, autreT)]);
      expect(await deezerPreviewMatch(a, t)).toBe("https://cdn/x.mp3");
    },
  );

  it("artistes séparés autrement : mêmes noms entiers", async () => {
    reponse([r("Bigflo & Oli", "Dommage")]);
    expect(await deezerPreviewMatch("Bigflo et Oli", "Dommage")).toBe(
      "https://cdn/x.mp3",
    );
  });

  it.each([
    ["Queen", "Hallelujah", "Piano Queen"],
    ["Queen", "Hallelujah", "Queen Tribute Band"],
    ["Muse", "Hallelujah", "Mamuse"],
    ["M", "Hallelujah", "M. Pokora"],
    ["Lou", "Imagine", "Louane"],
    ["Ana", "Hallelujah", "Anand Bhatt"],
    ["Sia", "Chandelier", "Anastasia"],
    ["Stromae", "Papaoutai", "Karaoke Stromae"],
  ])("%s, %s : refuse la reprise de %s", async (artiste, titre, autre) => {
    reponse([r(autre, titre)]);
    expect(await deezerPreviewMatch(artiste, titre)).toBeNull();
  });

  it("préfère le bon artiste même s'il arrive après une reprise", async () => {
    reponse([
      r("Made Famous by Adele", "Hello", "https://cdn/faux.mp3"),
      r("Adele", "Hello", "https://cdn/bon.mp3"),
    ]);
    expect(await deezerPreviewMatch("Adele", "Hello")).toBe(
      "https://cdn/bon.mp3",
    );
  });

  it("aucun résultat concordant : rien plutôt qu'un autre morceau", async () => {
    reponse([r("Stromae", "Alors on danse"), r("Autre", "Papaoutai")]);
    expect(await deezerPreviewMatch("Stromae", "Papaoutai")).toBeNull();
  });

  it("résultat sans extrait : ignoré", async () => {
    reponse([r("Stromae", "Papaoutai", null)]);
    expect(await deezerPreviewMatch("Stromae", "Papaoutai")).toBeNull();
  });

  it("Deezer en panne : null, jamais d'exception", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("réseau");
      }),
    );
    expect(await deezerPreviewMatch("S", "P")).toBeNull();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false })),
    );
    expect(await deezerPreviewMatch("S", "P")).toBeNull();
  });
});

describe("extrait iTunes trouvé par nom", () => {
  afterEach(() => vi.unstubAllGlobals());
  const itunes = (results) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ results }) })),
    );

  it("mêmes règles que Deezer : le bon titre, jamais une reprise", async () => {
    itunes([
      { artistName: "Piano Queen", trackName: "Hello", previewUrl: "faux" },
      { artistName: "Adele", trackName: "Hello", previewUrl: "bon" },
    ]);
    expect(await iTunesPreviewMatch("Adele", "Hello")).toBe("bon");
    expect(await iTunesPreviewMatch("Queen", "Hello")).toBeNull();
  });

  it("panne : null, jamais d'exception", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("réseau");
      }),
    );
    expect(await iTunesPreviewMatch("A", "T")).toBeNull();
  });
});

describe("rafraîchissement d'un extrait", () => {
  afterEach(() => vi.unstubAllGlobals());
  const repond = (body, ok = true) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok,
        status: ok ? 200 : 500,
        json: async () => body,
      })),
    );

  it("parseExpFromUrl : expiration du jeton hdnea, sinon null", () => {
    expect(parseExpFromUrl("https://cdn/p.mp3?hdnea=exp=1767225600~acl")).toBe(
      1767225600,
    );
    expect(parseExpFromUrl("https://cdn/p.mp3")).toBeNull();
    expect(parseExpFromUrl(null)).toBeNull();
  });

  it("Deezer par id : nouveau lien", async () => {
    repond({ preview: "https://cdn/neuf.mp3" });
    expect(await fetchDeezerTrackPreview("42")).toBe("https://cdn/neuf.mp3");
    expect(fetch.mock.calls[0][0]).toBe("https://api.deezer.com/track/42");
  });
  it.each([
    ["titre supprimé", { error: { code: 800 } }, true],
    ["sans extrait", { preview: "" }, true],
    ["HTTP 500", {}, false],
  ])("Deezer par id, %s : null", async (_, body, ok) => {
    repond(body, ok);
    expect(await fetchDeezerTrackPreview("42")).toBeNull();
  });

  it("iTunes par nom : extrait du bon titre", async () => {
    repond({
      results: [
        { artistName: "Adele", trackName: "Hello" },
        { artistName: "Adele", trackName: "Hello", previewUrl: "bon" },
      ],
    });
    expect(await iTunesPreviewSearch("Adele", "Hello")).toBe("bon");
  });
  // Utilisé par refreshExpiredPreviews (playlist.js) : contraire à la règle de
  // deezer.js « mieux vaut pas d'extrait qu'un autre morceau joué devant la salle »
  it.fails(
    "BUG : iTunes par nom accepte un autre morceau que celui demandé",
    async () => {
      repond({
        results: [
          { artistName: "Piano Queen", trackName: "Hello", previewUrl: "faux" },
        ],
      });
      expect(await iTunesPreviewSearch("Adele", "Hello")).toBeNull();
    },
  );
  it("iTunes : nom manquant, échec HTTP, aucun extrait ou panne : null", async () => {
    repond({ results: [] });
    expect(await iTunesPreviewSearch("", "T")).toBeNull();
    expect(await iTunesPreviewSearch("A", null)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(await iTunesPreviewSearch("A", "T")).toBeNull();
    repond({}, false);
    expect(await iTunesPreviewSearch("A", "T")).toBeNull();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("réseau");
      }),
    );
    expect(await iTunesPreviewSearch("A", "T")).toBeNull();
  });
});
