import { describe, it, expect } from "vitest";
import {
  stripVersion,
  titleKey,
  isDerived,
  displayArtist,
  stripFeat,
  sameArtist,
  compact,
  looseTitle,
  fullTitleMatch,
  segments,
  looseQueries,
  TRIBUTE,
  CATEGORY,
  THEMED,
  closeArtist,
  isYoutubeId,
} from "../matching.js";

describe("stripVersion et titleKey", () => {
  it.each([
    ["Hey Jude - Remastered 2015", "Hey Jude"],
    ["Wonderwall - Live", "Wonderwall"],
    ["Take On Me - Radio Edit", "Take On Me"],
    ["Don't Stop Me Now - 2011 Mix", "Don't Stop Me Now"],
    ["Imagine - Mono", "Imagine"],
    ["Creep - Acoustic Version", "Creep"],
  ])("« %s » → « %s »", (title, expected) => {
    expect(stripVersion(title)).toBe(expected);
  });

  it("garde un titre dont le mot-clé fait partie du nom (pas de tiret)", () => {
    expect(stripVersion("Live Forever")).toBe("Live Forever");
    expect(stripVersion("Mixed Up")).toBe("Mixed Up");
  });

  it("garde la partie après le tiret si elle n'est pas une version", () => {
    expect(stripVersion("Ça - C'est vraiment toi")).toBe(
      "Ça - C'est vraiment toi",
    );
  });

  it("supporte les valeurs vides sans lever", () => {
    expect(stripVersion(undefined)).toBe("");
    expect(stripVersion(null)).toBe("");
    expect(stripVersion(42)).toBe("42");
    expect(titleKey("")).toBe("");
  });

  it("titleKey rend égaux remaster, accents, crochets et casse", () => {
    const k = titleKey("Hey Jude");
    expect(titleKey("HEY JUDE - Remastered 2015")).toBe(k);
    expect(titleKey("Hey Jude [Remastered]")).toBe(k);
    expect(titleKey("Hey Jude (2015 Mix)")).toBe(k);
    expect(titleKey("Éblouie par la nuit")).toBe(
      titleKey("eblouie par la nuit"),
    );
  });

  it("titleKey ne vide pas un titre fait seulement de crochets", () => {
    expect(titleKey("[666]")).toBe("666");
  });
});

describe("isDerived", () => {
  const v = (o) => ({ title: "Song", title_short: "Song", ...o });

  it("repère live, remix, acoustique, session dans la mention de version", () => {
    expect(isDerived(v({ title_version: "(Live at Wembley)" }))).toBe(true);
    expect(isDerived(v({ title_version: "(Remix)" }))).toBe(true);
    expect(isDerived(v({ title_version: "(Version acoustique)" }))).toBe(true);
    expect(isDerived(v({ title: "Song (Spotify Sessions)" }))).toBe(true);
  });

  it("repère un album live ou unplugged", () => {
    expect(isDerived(v({ album: { title: "MTV Unplugged" } }))).toBe(true);
    expect(isDerived(v({ album: { title: "Live in Paris" } }))).toBe(true);
  });

  it("ne juge jamais le titre lui-même : « Live Forever » est un original", () => {
    expect(
      isDerived({
        title: "Live Forever",
        title_short: "Live Forever",
        album: { title: "Definitely Maybe" },
      }),
    ).toBe(false);
  });

  it("un remaster n'est pas une version dérivée", () => {
    expect(isDerived(v({ title_version: "(Remastered 2011)" }))).toBe(false);
  });

  it("supporte une version sans album ni titre", () => {
    expect(isDerived({})).toBe(false);
  });
});

describe("displayArtist", () => {
  it("nom Deezer seul sans invité", () => {
    expect(displayArtist("Daft Punk", "daft punk", ["Get Lucky"])).toBe(
      "Daft Punk",
    );
  });

  it("ajoute les invités de l'artiste saisi et des titres, sans doublon", () => {
    expect(
      displayArtist("Daft Punk", "Daft Punk feat. Pharrell Williams", [
        "Get Lucky (feat. Pharrell Williams & Nile Rodgers)",
        "Get Lucky [ft. Nile Rodgers]",
      ]),
    ).toBe("Daft Punk (feat. Pharrell Williams, Nile Rodgers)");
  });

  it("« Jr. » fait partie du nom, ce n'est pas un invité", () => {
    expect(displayArtist("Ray Parker, Jr.", "Ray Parker, Jr.", [])).toBe(
      "Ray Parker, Jr.",
    );
  });

  it("ignore l'artiste principal répété en invité et les titres vides", () => {
    expect(displayArtist("Orelsan", "Orelsan", ["(feat. Orelsan)", ""])).toBe(
      "Orelsan",
    );
  });

  it("découpe « et » et « and » dans les invités du titre", () => {
    expect(displayArtist("A", "A", ["T (avec B et C and D)"])).toBe(
      "A (feat. B, C, D)",
    );
  });
});

describe("stripFeat", () => {
  it.each([
    ["Get Lucky (feat. Pharrell Williams)", "Get Lucky"],
    ["Titre [ft. X]", "Titre"],
    ["Titre (avec Y) (Remix)", "Titre (Remix)"],
    ["Titre (with Z)", "Titre"],
    ["Featuring Song", "Featuring Song"],
  ])("« %s » → « %s »", (title, expected) => {
    expect(stripFeat(title)).toBe(expected);
  });

  it("supporte null", () => {
    expect(stripFeat(null)).toBe("");
  });
});

describe("sameArtist et closeArtist", () => {
  it.each([
    ["Jean-Jacques Goldman", "J J GOLDMAN"],
    ["Johnny Hallyday", "Johnny Halliday"],
    ["Stromae", "STROMAE"],
    ["Bigflo & Oli", "Bigflo"],
  ])("« %s » ~ « %s »", (a, b) => {
    expect(sameArtist(a, b)).toBe(true);
  });

  it("refuse les vides et les artistes différents", () => {
    expect(sameArtist("", "Stromae")).toBe(false);
    expect(sameArtist("Stromae", null)).toBe(false);
    expect(sameArtist("Queen", "Kiss")).toBe(false);
    // Deux lettres ne suffisent pas à dire qu'un nom en contient un autre
    expect(sameArtist("MC Solaar", "MC")).toBe(false);
  });

  it("closeArtist tolère les fautes de frappe et les sigles", () => {
    expect(closeArtist("Queen", "Quenn")).toBe(true);
    expect(closeArtist("Orchestral Manoeuvres in the Dark", "OMD")).toBe(true);
    expect(closeArtist("Cyndi Lauper", "CINDY LAUPER")).toBe(true);
  });

  it("closeArtist refuse un autre artiste et les vides", () => {
    expect(closeArtist("Queen", "Muse")).toBe(false);
    expect(closeArtist("Queen", "")).toBe(false);
    expect(closeArtist("", "Queen")).toBe(false);
  });
});

describe("compact, looseTitle, fullTitleMatch", () => {
  it("compact retire ponctuation et unifie & / et / and", () => {
    expect(compact("Rock & Roll")).toBe(compact("rock and roll"));
    expect(compact("Toi et moi")).toBe("toiandmoi");
    expect(compact(null)).toBe("");
  });

  it("accepte ponctuation, titre abrégé et mention en plus", () => {
    expect(looseTitle("Gimme! Gimme! Gimme!", "Gimme Gimme Gimme")).toBe(true);
    expect(
      looseTitle("Gimme Gimme Gimme (A Man After Midnight)", "Gimme Gimme"),
    ).toBe(true);
    expect(looseTitle("Bohemian Rapsody", "Bohemian Rhapsody")).toBe(true);
  });

  it("refuse si les chiffres diffèrent : « Persona 5 » n'est pas « Personal »", () => {
    expect(looseTitle("Persona 5", "Personal")).toBe(false);
    expect(looseTitle("1999", "1998")).toBe(false);
  });

  it("refuse un fragment trop court ou trop petit face au titre", () => {
    expect(looseTitle("Love", "Love Will Tear Us Apart Again Tonight")).toBe(
      false,
    );
    expect(looseTitle("Up", "Up Town Funk")).toBe(false);
  });

  it("refuse les vides", () => {
    expect(looseTitle("", "x")).toBe(false);
    expect(looseTitle("x", undefined)).toBe(false);
    expect(looseTitle("()", "()")).toBe(false);
  });

  it("fullTitleMatch essaie title_short puis le titre complet", () => {
    const v = { title_short: "Get Lucky", title: "Get Lucky (Radio Edit)" };
    expect(fullTitleMatch(v, "get lucky")).toBe(true);
    expect(fullTitleMatch({ title: "Get Lucky" }, "Get Lucky")).toBe(true);
    expect(fullTitleMatch(v, "One More Time")).toBe(false);
  });
});

describe("segments et looseQueries", () => {
  it("découpe un titre de vidéo d'anime et retire le bruit", () => {
    expect(
      segments(
        "Shingeki no Kyojin S1 OP1 | Linked Horizon - Guren no Yumiya (Lyrics)",
      ),
    ).toEqual(["Shingeki no Kyojin", "Linked Horizon", "Guren no Yumiya"]);
  });

  it("gère crochets japonais et séparateurs variés", () => {
    expect(segments("LiSA『Gurenge』Official Video")).toEqual([
      "LiSA",
      "Gurenge",
    ]);
    expect(segments("Artiste ~ Titre : Sous-titre")).toEqual([
      "Artiste",
      "Titre",
      "Sous-titre",
    ]);
  });

  it("ne garde rien d'un titre fait de bruit, ni d'une entrée vide", () => {
    expect(segments("Official Music Video (HD)")).toEqual([]);
    expect(segments(undefined)).toEqual([]);
    expect(segments("")).toEqual([]);
  });

  it("looseQueries : tout, puis les paires, puis chaque morceau, 6 au plus", () => {
    expect(looseQueries(["A", "B", "C"])).toEqual([
      "A B C",
      "A B",
      "A C",
      "B C",
      "A",
      "B",
    ]);
    expect(looseQueries(["A"])).toEqual(["A"]);
  });
});

describe("motifs TRIBUTE, CATEGORY, THEMED, isYoutubeId", () => {
  it("TRIBUTE repère reprises et karaokés", () => {
    expect(TRIBUTE.test("Karaoke Hits Band")).toBe(true);
    expect(TRIBUTE.test("Made Famous by Queen")).toBe(true);
    expect(TRIBUTE.test("Lofi Fruits Music")).toBe(true);
    expect(TRIBUTE.test("Queen")).toBe(false);
  });

  it("CATEGORY ne reconnaît que la catégorie entière", () => {
    for (const c of ["SERIE TV", "Séries", "Génériques TV", "OST", "Films"])
      expect(CATEGORY.test(c)).toBe(true);
    expect(CATEGORY.test("Serie TV Fan Club")).toBe(false);
    expect(CATEGORY.test("Queen")).toBe(false);
  });

  it("THEMED repère génériques et bandes originales", () => {
    expect(THEMED.test("Friends Theme")).toBe(true);
    expect(THEMED.test("Original Motion Picture Soundtrack")).toBe(true);
    expect(THEMED.test("Bohemian Rhapsody")).toBe(false);
  });

  it("isYoutubeId : artiste et titre identiques sur 11 caractères", () => {
    expect(isYoutubeId({ artist: "dQw4w9WgXcQ", title: "dQw4w9WgXcQ" })).toBe(
      true,
    );
    expect(isYoutubeId({ artist: "dQw4w9WgXcQ", title: "Never" })).toBe(false);
    expect(isYoutubeId({ artist: "ABBA", title: "ABBA" })).toBe(false);
  });
});
