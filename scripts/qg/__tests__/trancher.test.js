import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { lireATrancher, lireChantiers } from "../trancher.mjs";

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

describe("lireChantiers", () => {
  it("lit statut, équipe et prochaine étape ; statut inconnu = à faire", () => {
    const md = [
      "# Chantiers",
      "## Accueil",
      "- **Statut** : En cours",
      "- **Équipe** : Produit (Nina)",
      "- **Prochaine étape** : maquette",
      "## Régie",
      "- **Statut** : à faire",
      "## Hotfix",
      "- **Statut** : fait",
      "## Promo",
      "- **Statut** : à valider par Théo",
      "## Sans statut",
    ].join("\n");
    expect(lireChantiers(md)).toEqual([
      {
        titre: "Accueil",
        statut: "En cours",
        equipe: "Produit (Nina)",
        "prochaine etape": "maquette",
        etat: "en-cours",
      },
      { titre: "Régie", statut: "à faire", etat: "a-faire" },
      { titre: "Hotfix", statut: "fait", etat: "fait" },
      { titre: "Promo", statut: "à valider par Théo", etat: "a-faire" },
      { titre: "Sans statut", etat: "a-faire" },
    ]);
  });

  it("lit le vrai fichier : chaque chantier a un statut connu", () => {
    const md = readFileSync(
      new URL("../../../docs/strategie/chantiers.md", import.meta.url),
      "utf8",
    );
    const chantiers = lireChantiers(md);
    expect(chantiers.length).toBeGreaterThan(5);
    for (const c of chantiers)
      expect(c.statut).toMatch(/^(en cours|à faire|fait)$/);
  });
});
