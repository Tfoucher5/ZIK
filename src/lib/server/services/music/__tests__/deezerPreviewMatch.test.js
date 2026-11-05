import { describe, it, expect, vi, afterEach } from "vitest";
import { deezerPreviewMatch } from "../deezer.js";

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
