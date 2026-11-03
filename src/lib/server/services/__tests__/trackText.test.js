import { describe, it, expect } from "vitest";
import { cleanString, displayString } from "../music/trackText.js";

describe("titres entre crochets ou parenthèses", () => {
  it("retire les mentions annexes", () => {
    expect(displayString("Titre (Remix) [Live]")).toBe("Titre");
    expect(cleanString("Titre (Remix)")).toBe("titre");
  });

  it("garde un titre qui n'est qu'une mention : « [666] » de Kruelty", () => {
    expect(displayString("[666]")).toBe("666");
    expect(cleanString("[666]")).toBe("666");
    expect(displayString("(Interlude)")).toBe("Interlude");
  });

  it("retire quand même les parenthèses autour d'un titre entre crochets", () => {
    expect(displayString("[666] (Live)")).toBe("666");
    expect(cleanString("[666] (Live)")).toBe("666");
  });
});
