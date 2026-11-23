import { describe, it, expect } from "vitest";
import { famille, segments } from "../public/familles.js";
import { phrase } from "../actions.mjs";

describe("famille", () => {
  it("range chaque phrase du QG dans sa famille", () => {
    const cas = [
      [phrase("Read", { file_path: "a/b.js" }), "lit"],
      [phrase("Grep", { pattern: "x" }), "lit"],
      [phrase("Edit", { file_path: "a/b.js" }), "ecrit"],
      [phrase("Write", { file_path: "a/b.js" }), "ecrit"],
      [phrase("Bash", { command: "npx vitest run" }), "tests"],
      [phrase("Bash", { command: "npx svelte-check" }), "build"],
      [phrase("Bash", { command: "git commit -m x" }), "git"],
      [phrase("Bash", { command: "gh pr create" }), "git"],
      [phrase("Bash", { command: "gh pr merge 3" }), "git"],
      [phrase("WebFetch", {}), "web"],
      [phrase("WebSearch", { query: "q" }), "web"],
      [phrase("mcp__claude_ai_Supabase__execute_sql", {}), "base"],
      [phrase("mcp__claude_ai_Railway__get-logs", {}), "prod"],
      [phrase("AskUserQuestion", {}), "question"],
      [phrase("TodoWrite", {}), "pense"],
      ["", "pense"],
      [undefined, "pense"],
    ];
    for (const [quoi, f] of cas)
      expect([quoi, famille(quoi)]).toEqual([quoi, f]);
  });
});

describe("segments", () => {
  const traces = [
    { t: 0, quoi: "Lit a.js" },
    { t: 60e3, quoi: "Lance les tests" },
  ];
  it("fait durer une action jusqu'à la suivante, la dernière jusqu'à maintenant si l'instance travaille", () => {
    expect(segments(traces, 200e3, true)).toEqual([
      { f: "lit", t0: 0, t1: 60e3 },
      { f: "tests", t0: 60e3, t1: 200e3 },
    ]);
  });
  it("coupe une attente à 3 min", () => {
    const longues = [
      { t: 0, quoi: "Lit a.js" },
      { t: 600e3, quoi: "Lance les tests" },
    ];
    expect(segments(longues, 1000e3, true).map((s) => s.t1)).toEqual([
      180e3, 780e3,
    ]);
  });
  it("coupe la dernière action à 30 s pour une instance arrêtée, 5 s au minimum", () => {
    expect(segments(traces, 200e3, false)[1].t1).toBe(90e3);
    expect(segments([{ t: 0, quoi: "Lit" }], 1e3, true)[0].t1).toBe(5e3);
  });
});
