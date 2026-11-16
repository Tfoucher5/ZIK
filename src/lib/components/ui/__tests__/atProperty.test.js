import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Un @property s'enregistre pour tout le document et reste après la page qui l'a
// chargé : un nom court (--w) casse ensuite les composants qui l'utilisent pour
// autre chose (Card.svelte : --w: 230px). D'où un préfixe de domaine obligatoire.
const fichiers = (dir) =>
  readdirSync(dir, { recursive: true })
    .map((f) => join(dir, f).replaceAll("\\", "/"))
    .filter((f) => /\.(svelte|css|js)$/.test(f) && !f.includes("__tests__"));

const TOUS = [...fichiers("src"), ...fichiers("static/css")].map((f) => [
  f,
  readFileSync(f, "utf8"),
]);

// Noms d'avant la règle, gardés dans leur famille fermée (les cartes)
const CARTES = ["--sheen", "--mx", "--my"];
const dansCartes = (f) =>
  f.startsWith("src/lib/components/card/") || f === "static/css/cards.css";

const usages = (nom) =>
  TOUS.filter(([, txt]) => new RegExp(`${nom}(?![\\w-])`).test(txt)).map(
    ([f]) => f,
  );

describe("@property : noms enregistrés pour tout le site", () => {
  const decl = TOUS.flatMap(([f, txt]) =>
    [...txt.matchAll(/@property\s+(--[\w-]+)/g)].map((m) => [m[1], f]),
  );

  it("chaque nom est préfixé par son domaine et déclaré une seule fois", () => {
    const noms = decl.map(([n]) => n);
    expect(new Set(noms).size).toBe(noms.length);
    for (const [nom, f] of decl)
      if (!CARTES.includes(nom))
        expect(nom, f).toMatch(/^--[a-z0-9]+-[a-z0-9-]+$/);
  });

  it("les anciens noms courts des cartes ne servent qu'aux cartes", () => {
    for (const nom of CARTES)
      expect(
        usages(nom).filter((f) => !dansCartes(f)),
        nom,
      ).toEqual([]);
  });

  it("un nom préfixé n'est utilisé que dans le fichier qui le déclare", () => {
    for (const [nom, f] of decl.filter(([n]) => !CARTES.includes(n)))
      expect(usages(nom), nom).toEqual([f]);
  });
});
