import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { lireATrancher } from "../trancher.mjs";

describe("lireATrancher", () => {
  it("lit une décision par section, champs nommés sans accents", () => {
    const md = [
      "# À trancher",
      "",
      "Texte d'intro ignoré.",
      "- **Chantier** : hors section, ignoré",
      "```",
      "## Gabarit dans un bloc de code, ignoré",
      "- **Question** : …",
      "```",
      "",
      "## Connecter Stripe",
      "- **Chantier** : Argent",
      "- **Depuis** : 15/11",
      "- **Question** : Brancher `Stripe` : lecture seule ?",
      "- **Options** : oui / non",
      "- **Recommandation** : oui",
      "- **Lien** : https://exemple.fr/a",
      "",
      "## Accueil refait",
      "- **Statut** : bientôt",
      "- **Question** : valider la maquette",
    ].join("\r\n");
    expect(lireATrancher(md)).toEqual([
      {
        titre: "Connecter Stripe",
        chantier: "Argent",
        depuis: "15/11",
        question: "Brancher Stripe : lecture seule ?",
        options: "oui / non",
        recommandation: "oui",
        lien: "https://exemple.fr/a",
      },
      {
        titre: "Accueil refait",
        statut: "bientôt",
        question: "valider la maquette",
      },
    ]);
  });

  it("lit le vrai fichier : chaque décision a sa question", () => {
    const md = readFileSync(
      new URL("../../../docs/strategie/a-trancher.md", import.meta.url),
      "utf8",
    );
    const decisions = lireATrancher(md);
    expect(decisions.length).toBeGreaterThan(0);
    for (const d of decisions) expect(d.question).toBeTruthy();
  });
});
