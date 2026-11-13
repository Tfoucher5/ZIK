import { describe, it, expect } from "vitest";
import {
  Suivi,
  cout,
  tarif,
  resumeOutil,
  lireOrganigramme,
} from "../journaux.mjs";

const T0 = Date.parse("2026-11-13T15:00:00Z");
const ligne = (o) => ({
  sessionId: "s1",
  timestamp: new Date(T0).toISOString(),
  cwd: "C:\\dev\\ZIK",
  gitBranch: "develop",
  ...o,
});
const usage = {
  input_tokens: 10,
  output_tokens: 100,
  cache_read_input_tokens: 1000,
  cache_creation_input_tokens: 0,
};

describe("cout", () => {
  it("applique le tarif du modèle, cache compris", () => {
    expect(tarif("claude-sonnet-5-5")).toEqual({
      entree: 2,
      sortie: 10,
      lecture: 0.1,
    });
    expect(cout("claude-opus-5-5", usage)).toBeCloseTo(
      (10 * 4 + 100 * 20 + 1000 * 0.2) / 1e6,
    );
  });

  it("compte l'écriture de cache 1 h au double du prix d'entrée", () => {
    const u = {
      cache_creation_input_tokens: 1000,
      cache_creation: { ephemeral_1h_input_tokens: 1000 },
    };
    expect(cout("claude-opus-5-5", u)).toBeCloseTo((1000 * 8) / 1e6);
  });

  it("retombe sur le tarif Opus 5.5 pour un modèle inconnu", () => {
    expect(tarif("modele-inconnu").entree).toBe(4);
  });
});

describe("resumeOutil", () => {
  it("garde la fin du chemin et coupe les commandes longues", () => {
    expect(resumeOutil("Edit", { file_path: "C:\\ZIK\\src\\lib\\a.js" })).toBe(
      "Edit · lib/a.js",
    );
    expect(resumeOutil("Bash", { command: "x".repeat(200) })).toHaveLength(77);
    expect(resumeOutil("TodoWrite")).toBe("TodoWrite");
  });
});

describe("Suivi", () => {
  it("ne compte qu'une fois un message écrit en plusieurs lignes", () => {
    const s = new Suivi();
    const m = (out) =>
      ligne({
        type: "assistant",
        message: {
          id: "m1",
          model: "claude-opus-5-5",
          usage: { ...usage, output_tokens: out },
          content: [],
        },
      });
    s.ligne(m(50));
    s.ligne(m(100));
    expect(s.sessions.get("s1").tokens).toBe(1110);
    expect(s.instantane(T0).aujourdhui.tokens).toBe(1110);
  });

  it("suit un agent du lancement à la fin", () => {
    const s = new Suivi();
    s.ligne(
      ligne({
        type: "user",
        message: { content: "<command-name>/tech</command-name>" },
      }),
    );
    s.ligne(
      ligne({
        type: "assistant",
        message: {
          id: "m1",
          content: [
            {
              type: "tool_use",
              id: "t1",
              name: "Agent",
              input: { subagent_type: "dev", description: "Page lieu" },
            },
          ],
        },
      }),
    );
    expect(s.instantane(T0).enAttente).toEqual([
      { type: "dev", description: "Page lieu", t: T0 },
    ]);
    s.meta("a1", "s1", {
      agentType: "dev",
      description: "Page lieu",
      finished: false,
    });
    s.ligne(
      ligne({
        type: "assistant",
        agentId: "a1",
        message: {
          id: "m2",
          model: "claude-sonnet-5-5",
          usage,
          content: [
            {
              type: "tool_use",
              id: "x",
              name: "Read",
              input: { file_path: "a/b.js" },
            },
          ],
        },
      }),
      "a1",
    );
    let etat = s.instantane(T0 + 1000);
    expect(etat.sessions[0].skill).toBe("tech");
    expect(etat.agents[0]).toMatchObject({
      type: "dev",
      actif: true,
      activite: "Read · a/b.js",
    });
    expect(etat.enAttente).toEqual([]);
    s.ligne(
      ligne({
        type: "user",
        toolUseResult: { status: "completed", agentId: "a1", agentType: "dev" },
        message: { content: [{ type: "tool_result", tool_use_id: "t1" }] },
      }),
    );
    etat = s.instantane(T0 + 2000);
    expect(etat.agents[0].actif).toBe(false);
    expect(etat.flux[0]).toMatchObject({ qui: "dev", quoi: "a terminé" });
  });

  it("ignore les lignes sans session ou sans message", () => {
    const s = new Suivi();
    s.ligne(null);
    s.ligne({ type: "summary" });
    s.ligne(ligne({ type: "attachment" }));
    expect(s.instantane(T0).agents).toEqual([]);
  });
});

describe("lireOrganigramme", () => {
  it("lit chefs, équipes et board dans le tableau du CLAUDE.md", () => {
    const md = [
      "### L'entreprise d'agents",
      "| Chef | Skill | Équipe |",
      "| --- | --- | --- |",
      "| CEO | `/ceo` | les chefs |",
      "| Opérations (COO) | `/operations` | `chef-projet`, `recette` ; `suite` chaque jour |",
      "| Board | `/board` | `chef-*`, `avocat` |",
      "## Suite",
      "| X | `/hors` | `rien` |",
    ].join("\n");
    expect(lireOrganigramme(md)).toEqual({
      chefs: [
        { id: "ceo", nom: "CEO", skill: "ceo", equipe: [] },
        {
          id: "operations",
          nom: "Opérations (COO)",
          skill: "operations",
          equipe: ["chef-projet", "recette"],
        },
      ],
      board: ["chef-*", "avocat"],
    });
    expect(lireOrganigramme("rien")).toEqual({ chefs: [], board: [] });
  });
});
