import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// Le podium s'adresse à tout le monde : jamais « le grand gagnant », « premier » ou « première »
const FICHIERS = [
  "src/lib/components/salon/host/HostFinale.svelte",
  "src/lib/components/soiree/Podium.svelte",
  "src/lib/components/soiree/soireeBeats.js",
];

describe("textes du podium neutres en genre", () => {
  it.each(FICHIERS)("%s", (f) => {
    const texte = readFileSync(f, "utf8");
    expect(texte).not.toMatch(/gagnante? est|\b(le|la) premi(er|ère) qui\b/i);
    expect(texte).not.toBe("");
  });
});
