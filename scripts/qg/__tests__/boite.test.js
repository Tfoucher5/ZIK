import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it, expect } from "vitest";
import { ajouterReponses, lireReponses, lireLimites } from "../boite.mjs";

let dossier;
const nouveau = () =>
  (dossier = join(mkdtempSync(join(tmpdir(), "qg-")), "boite"));
afterEach(() => rmSync(join(dossier, ".."), { recursive: true, force: true }));

describe("boîte du QG", () => {
  it("ajoute les réponses datées, une ligne JSON chacune, et garde la dernière par titre", () => {
    nouveau();
    const d1 = new Date("2026-11-15T20:00:00Z");
    expect(
      ajouterReponses(
        dossier,
        {
          reponses: [
            { titre: "TVA", reponse: " micro " },
            { titre: "Promo", reponse: "oui" },
          ],
        },
        d1,
      ),
    ).toBe(2);
    ajouterReponses(dossier, {
      reponses: [{ titre: "TVA", reponse: "finalement non" }],
    });
    const lignes = readFileSync(join(dossier, "reponses.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(lignes[0]).toEqual({
      date: d1.toISOString(),
      titre: "TVA",
      reponse: "micro",
    });
    expect(lignes).toHaveLength(3);
    const r = lireReponses(dossier);
    expect(r.get("TVA").reponse).toBe("finalement non");
    expect(r.get("Promo").reponse).toBe("oui");
  });

  it("refuse un envoi mal formé sans rien écrire", () => {
    nouveau();
    for (const corps of [
      null,
      {},
      { reponses: [] },
      { reponses: "x" },
      { reponses: [{ titre: "a", reponse: 42 }] },
      { reponses: [{ titre: "a", reponse: "   " }] },
      { reponses: [{ titre: "a", reponse: "x".repeat(5001) }] },
      { reponses: [{ titre: "ok", reponse: "ok" }, null] },
      { reponses: Array(51).fill({ titre: "a", reponse: "b" }) },
    ])
      expect(() => ajouterReponses(dossier, corps)).toThrow();
    expect(lireReponses(dossier).size).toBe(0);
  });

  it("lit les limites de la barre d'état, ou null", () => {
    nouveau();
    expect(lireLimites(dossier)).toBeNull();
    ajouterReponses(dossier, { reponses: [{ titre: "a", reponse: "b" }] });
    writeFileSync(
      join(dossier, "limites.json"),
      '{"five_hour":{"used_percentage":12}}',
    );
    expect(lireLimites(dossier).five_hour.used_percentage).toBe(12);
  });
});
