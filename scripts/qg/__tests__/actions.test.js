import { describe, it, expect } from "vitest";
import { phrase } from "../actions.mjs";

describe("phrase", () => {
  it("dit l'action en français, sans la commande brute", () => {
    expect(phrase("Read", { file_path: "C:\\ZIK\\src\\reclaim.js" })).toBe(
      "Lit reclaim.js",
    );
    expect(phrase("Edit", { file_path: "a/reclaim.js" })).toBe(
      "Modifie reclaim.js",
    );
    expect(phrase("Grep", { pattern: "buzzLocked" })).toBe(
      "Cherche « buzzLocked »",
    );
    expect(phrase("Bash", { command: "cd x && npx vitest run a" })).toBe(
      "Lance les tests",
    );
    expect(phrase("Bash", { command: 'gh pr create --title "x"' })).toBe(
      "Ouvre une PR",
    );
    expect(
      phrase("Bash", { command: "rm -rf tmp", description: "Clean tmp" }),
    ).toBe("Lance une commande");
    expect(phrase("Bash", { command: "cd x && ls scripts" })).toBe(
      "Parcourt des fichiers",
    );
    expect(phrase("Bash", { command: "node scripts/qg/serveur.mjs" })).toBe(
      "Démarre un serveur",
    );
    expect(phrase("mcp__claude_ai_Supabase__execute_sql")).toBe(
      "Utilise Supabase",
    );
    expect(phrase("Inconnu", null)).toBe("Utilise Inconnu");
  });

  it("coupe les textes longs", () => {
    expect(phrase("Grep", { pattern: "x".repeat(200) }).length).toBeLessThan(
      45,
    );
  });
});
