import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";

const DIR = "supabase/migrations";
const sql = readdirSync(DIR)
  .sort()
  .map((f) => readFileSync(`${DIR}/${f}`, "utf8"))
  .join("\n")
  .replace(/--.*$/gm, "");
const route = readFileSync(
  "src/routes/(site)/api/profile/update/+server.js",
  "utf8",
);

const lastMatch = (re) => [...sql.matchAll(re)].at(-1);

describe("droits du joueur sur public.profiles", () => {
  it("tous les droits par défaut sont retirés à anon et authenticated", () => {
    const revoke = lastMatch(
      /revoke all on table public\.profiles from ([^;]+);/g,
    );
    expect(revoke?.[1]).toMatch(/anon/);
    expect(revoke?.[1]).toMatch(/authenticated/);
    expect(sql.slice(revoke.index)).not.toMatch(
      /grant (all|insert|delete|truncate|update) on (table )?("?public"?\.)?"?profiles"? to [^;]*(anon|authenticated)/i,
    );
  });

  it("le joueur ne peut modifier que les colonnes de /api/profile/update", () => {
    const grant = lastMatch(
      /grant update \(([^)]+)\)\s+on table public\.profiles to authenticated;/g,
    );
    const granted = grant[1].split(",").map((c) => c.trim());
    const written = [...route.matchAll(/updates\.(\w+) =/g)].map((m) => m[1]);
    expect(granted.sort()).toEqual([...new Set(written)].sort());
    expect(granted).not.toContain("role");
  });
});
