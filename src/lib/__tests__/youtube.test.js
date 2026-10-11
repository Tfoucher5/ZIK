import { describe, it, expect } from "vitest";
import { extractYoutubeId, pickAutoIndex } from "../youtube.js";

describe("extractYoutubeId", () => {
  const ID = "dQw4w9WgXcQ";
  it.each([
    [ID],
    [`https://www.youtube.com/watch?v=${ID}`],
    [`https://youtube.com/watch?feature=share&v=${ID}&t=42`],
    [`https://m.youtube.com/watch?v=${ID}`],
    [`https://music.youtube.com/watch?v=${ID}&list=RD`],
    [`https://youtu.be/${ID}?si=abc`],
    [`https://www.youtube.com/shorts/${ID}`],
    [`https://www.youtube.com/embed/${ID}`],
    [`https://www.youtube-nocookie.com/embed/${ID}`],
    [`  ${ID}  `],
  ])("lit %s", (input) => {
    expect(extractYoutubeId(input)).toBe(ID);
  });

  it.each([
    [""],
    [null],
    ["pas un lien"],
    ["dQw4w9WgXc"],
    ["https://vimeo.com/123456789"],
    ["https://www.youtube.com/watch?v=trop_court"],
    ["https://evil.com/watch?v=dQw4w9WgXcQ"],
  ])("refuse %s", (input) => {
    expect(extractYoutubeId(input)).toBeNull();
  });
});

describe("pickAutoIndex", () => {
  it("préfère la chaîne « - Topic »", () => {
    const results = [
      { channel: "Fan Covers" },
      { channel: "Daft Punk - Topic" },
      { channel: "Daft Punk" },
    ];
    expect(pickAutoIndex(results)).toBe(1);
  });

  it("lit aussi le champ uploader", () => {
    expect(pickAutoIndex([{}, { uploader: "PNL - Topic" }])).toBe(1);
  });

  it("prend le premier résultat sans chaîne Topic", () => {
    expect(pickAutoIndex([{ channel: "A" }, { channel: "B" }])).toBe(0);
  });

  it("renvoie -1 sans résultat", () => {
    expect(pickAutoIndex([])).toBe(-1);
  });
});
