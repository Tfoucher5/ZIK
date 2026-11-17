import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { niveau, lieux } from "../public/tour/plan.js";
import { dessinsPenthouse } from "../public/tour/trait.js";
import { dessinerPlan } from "../public/tour/dessin.js";
import { ALBUMS } from "../public/tour3d/penthouse3d-albums.js";

const n7 = niveau("n7");
const types = [
  ...new Set(
    lieux(n7)
      .flatMap((p) => p.mobilier)
      .map((m) => m.type)
      .filter((t) => t.startsWith("p-")),
  ),
];
// three n'est pas installé pour vitest : on lit les clés des modèles dans les sources.
const sources = ["", "-hall", "-terrasse"]
  .map((s) =>
    readFileSync(
      new URL(`../public/tour3d/penthouse3d${s}.js`, import.meta.url),
      "utf8",
    ),
  )
  .join("\n");

describe("penthouse N7", () => {
  it("a son mobilier extravagant dans le plan", () => {
    for (const t of ["p-mur-albums", "p-piscine", "p-mezzanine", "p-piano"])
      expect(types).toContain(t);
  });

  it("donne à chaque type p-* un modèle 3D et un dessin 2D", () => {
    const dessins = dessinsPenthouse({});
    for (const t of types) {
      expect(sources, t).toContain(`"${t}":`);
      expect(dessins[t], t).toBeTypeOf("function");
    }
  });

  it("dessine le N7 sans erreur avec ses nouveaux meubles", () => {
    const svg = dessinerPlan(n7);
    expect(svg).toContain("mezzanine");
    expect(svg).toContain("Hall of Fame");
  });

  it("a un mur d'albums sans doublon, tous nommés", () => {
    const cles = ALBUMS.map((a) => `${a.artiste}|${a.titre}`.toLowerCase());
    expect(new Set(cles).size).toBe(ALBUMS.length);
    expect(new Set(ALBUMS.map((a) => a.titre)).size).toBe(ALBUMS.length);
    for (const a of ALBUMS) {
      expect(a.artiste && a.titre).toBeTruthy();
      expect(a.fond).not.toBe(a.encre);
    }
    expect(ALBUMS.map((a) => a.artiste)).not.toContain("Stromae");
  });
});
