import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Tables sorties de public (phase 4) : la vue de compatibilité disparaîtra,
// toute requête doit donc nommer le schéma.
const SCHEMA_OF = {
  follows: "social",
  friendships: "social",
  notifications: "social",
  notification_once: "social",
  push_subscriptions: "social",
  admin_audit_log: "ops",
  reports: "ops",
  prospects: "ops",
  prospect_replies: "ops",
  visit_sources: "ops",
  site_settings: "ops",
};

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory())
      return name === "__tests__" || name === "node_modules" ? [] : files(path);
    return /\.(js|mjs|svelte)$/.test(name) ? [path] : [];
  });
}

function wrongSchemaCalls(source) {
  const bad = [];
  for (const m of source.matchAll(/\.from\(\s*["'`]([a-z_]+)["'`]\s*\)/g)) {
    const want = SCHEMA_OF[m[1]];
    if (!want) continue;
    const before = source.slice(0, m.index).trimEnd();
    if (!before.endsWith(`.schema("${want}")`)) bad.push(m[1]);
  }
  // PostgREST ne joint pas d'un schéma à l'autre (PGRST200) : une jointure
  // dans le select doit viser une table du même schéma.
  const query =
    /\.schema\("(\w+)"\)\s*\.from\("\w+"\)(?:(?!\.from\()[\s\S])*?\.select\(\s*"([^"]*)"/g;
  for (const [, schema, cols] of source.matchAll(query))
    for (const [, name] of cols.matchAll(/(?:\w+:)?(\w+)(?:!\w+)?\s*\(/g))
      if (SCHEMA_OF[name] !== schema) bad.push(`${schema} -> ${name}`);
  return bad;
}

describe("tables rangées par domaine", () => {
  it("repère une requête sans son schéma", () => {
    expect(wrongSchemaCalls('sb.from("follows")')).toEqual(["follows"]);
    expect(wrongSchemaCalls('sb.schema("ops").from("follows")')).toEqual([
      "follows",
    ]);
    expect(
      wrongSchemaCalls('sb\n  .schema("social")\n  .from("follows")'),
    ).toEqual([]);
    expect(wrongSchemaCalls('sb.from("profiles")')).toEqual([]);
  });

  it("repère une jointure vers un autre schéma", () => {
    expect(
      wrongSchemaCalls(
        'sb.schema("social").from("follows").select("id, user:profiles!follows_fkey(id)")',
      ),
    ).toEqual(["social -> profiles"]);
    expect(
      wrongSchemaCalls(
        'sb.schema("ops").from("prospect_replies").select("id, prospects(name)")',
      ),
    ).toEqual([]);
  });

  it("le code serveur et les scripts passent par le bon schéma", () => {
    const bad = ["src", "scripts", "server.js"]
      .flatMap((p) => (statSync(p).isDirectory() ? files(p) : [p]))
      .flatMap((f) =>
        wrongSchemaCalls(readFileSync(f, "utf8")).map((t) => `${f}: ${t}`),
      );
    expect(bad).toEqual([]);
  });
});
