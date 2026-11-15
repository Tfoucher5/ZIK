import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const racine = new URL("../../../.claude/", import.meta.url);
const fiches = [
  ...readdirSync(new URL("agents/", racine)).map((f) => `agents/${f}`),
  ...readdirSync(new URL("skills/", racine)).map((d) => `skills/${d}/SKILL.md`),
];

describe("frontmatter des agents et skills", () => {
  it.each(fiches)("%s se charge", (fiche) => {
    const texte = readFileSync(new URL(fiche, racine), "utf8");
    const entete = texte.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
    expect(entete).toMatch(/^name: /m);
    expect(entete).toMatch(/^description: /m);
    // Une valeur YAML sans guillemets qui contient « : » rend la fiche invalide : Claude Code l'ignore
    const fautives = entete
      .split(/\r?\n/)
      .filter((l) => /^\w+: [^"'].*: /.test(l));
    expect(fautives).toEqual([]);
  });
});
