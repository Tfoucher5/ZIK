import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";

const DIR = "supabase/migrations";
const sql = readdirSync(DIR)
  .sort()
  .map((f) => readFileSync(`${DIR}/${f}`, "utf8"))
  .join("\n")
  .replace(/--.*$/gm, "");

// Arguments sans schéma : une table déplacée garde la clé de sa fonction.
const cle = (f) => f.replace(/\(\w+\./, "(").replace(/\s+/g, "");

const roles = {};
for (const m of sql.matchAll(
  /(grant|revoke) execute on function ([\s\S]+?) (to|from) ([\w\s,]+);/gi,
)) {
  const fonctions = m[2].match(/[\w.]+\([^)]*\)/g) ?? [];
  const cibles = m[4].split(",").map((r) => r.trim().toLowerCase());
  for (const f of fonctions) {
    const k = cle(f);
    roles[k] ??= new Set();
    for (const r of cibles)
      m[1].toLowerCase() === "grant" ? roles[k].add(r) : roles[k].delete(r);
  }
}

describe("droits des fonctions", () => {
  it("le lien titre → carte est lisible par un compte connecté", () => {
    expect([...roles["catalog.cards(tracks)"]]).toContain("authenticated");
  });

  it("une fonction ouverte à anon l'est aussi aux comptes connectés", () => {
    const manquants = Object.entries(roles)
      .filter(([, r]) => r.has("anon") && !r.has("authenticated"))
      .map(([k]) => k);
    expect(manquants).toEqual([]);
  });
});
