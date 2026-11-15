import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { agentsDepuis, entete, lireAgents } from "../agents.mjs";
import * as noms from "../public/noms.js";

const org = {
  chefs: [{ id: "tech", nom: "Technique (CTO)", equipe: ["dev", "reviewer"] }],
  board: ["avocat"],
};
const fiche = (id, description, model = "opus") => ({
  id,
  texte: `---\nname: ${id}\nmodel: ${model}\ndescription: "${description}"\n---\n\nCorps.`,
});

describe("entete", () => {
  it("lit les champs du frontmatter, guillemets retirés", () => {
    expect(entete('---\r\nname: a\r\ndescription: "x : y"\r\n---')).toEqual({
      name: "a",
      description: "x : y",
    });
    expect(entete("pas de frontmatter")).toEqual({});
  });
});

describe("noms.js", () => {
  it("chaque agent a un prénom différent", () => {
    const prenoms = Object.values(noms.EQUIPE).map((p) => p.nom);
    expect(prenoms.filter((p, i) => prenoms.indexOf(p) !== i)).toEqual([]);
  });
});

describe("agentsDepuis (GET /agents)", () => {
  it("donne prénom, rôle, équipe et modèle de chaque agent", () => {
    const liste = agentsDepuis(
      [
        fiche("offres", "Spécialiste (équipe Argent) des prix.", "sonnet"),
        fiche("seo", "SEO (équipe Marketing et ventes)."),
        fiche("dev", "Développeur de ZIK."),
        fiche("chef-tech", "CTO au board."),
        fiche("avocat", "Avocat du diable."),
        fiche("nouveau", "Sans équipe."),
      ],
      org,
      noms,
    );
    expect(liste.map((a) => [a.id, a.nom, a.equipe])).toEqual([
      ["avocat", "Victor", "board"],
      ["chef-tech", "Karim", "board"],
      ["dev", "Mehdi", "Technique"],
      ["nouveau", noms.fiche("nouveau").nom, "renforts"],
      ["offres", "Camille", "Argent"],
      ["seo", "Jade", "Marketing"],
    ]);
    expect(liste.find((a) => a.id === "offres")).toEqual({
      id: "offres",
      nom: "Camille",
      role: "offres",
      equipe: "Argent",
      model: "sonnet",
    });
    // Prénom par défaut stable et rôle = id pour un agent hors de noms.js
    expect(liste.find((a) => a.id === "nouveau").role).toBe("nouveau");
  });

  it("lit le vrai dossier .claude/agents : chaque fichier donne un agent nommé", async () => {
    const racine = fileURLToPath(new URL("../../../", import.meta.url));
    const liste = await lireAgents(racine, org);
    expect(liste.length).toBeGreaterThan(10);
    expect(liste.find((a) => a.id === "dev")).toMatchObject({
      nom: "Mehdi",
      equipe: "Technique",
    });
    for (const a of liste) {
      expect(a.nom).toBeTruthy();
      expect(a.equipe).toBeTruthy();
    }
  });
});
