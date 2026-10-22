import { describe, it, expect } from "vitest";
import { mainArtist, answerSlots } from "../answers.js";

describe("mainArtist", () => {
  it("retire les featurings", () => {
    expect(mainArtist("Ninho feat. Jul")).toBe("Ninho");
    expect(mainArtist("Ninho (ft. Jul)")).toBe("Ninho");
    expect(mainArtist("Ninho, Jul")).toBe("Ninho");
    expect(mainArtist("Ninho & Jul")).toBe("Ninho");
    expect(mainArtist("Ninho")).toBe("Ninho");
  });
});

describe("answerSlots", () => {
  it("découpe artiste et titre, marque trouvé ou raté", () => {
    const s = answerSlots({
      answer: "Ninho feat. Jul - Bad Boy",
      featArtists: ["Jul"],
      foundArtist: true,
      foundTitle: false,
      foundFeats: [true],
    });
    expect(s.artist).toEqual({ val: "Ninho", state: "found" });
    expect(s.title).toEqual({ val: "Bad Boy", state: "missed" });
    expect(s.feats).toEqual([{ val: "Jul", state: "found" }]);
    expect(s.extras).toEqual([]);
  });

  it("sans tiret : tout est l'artiste, titre vide", () => {
    const s = answerSlots({ answer: "Daft Punk" });
    expect(s.artist.val).toBe("Daft Punk");
    expect(s.title.val).toBe("—");
  });
});
