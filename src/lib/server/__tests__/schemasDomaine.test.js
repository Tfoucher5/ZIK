import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Schéma de chaque table (phase 4 du plan). Une table hors de public se lit
// par .schema("…") ; une jointure ne vise qu'une table du même schéma
// (PostgREST ne suit pas une clé étrangère d'un schéma à l'autre, PGRST200),
// sinon elle passe par une fonction de lien (computed relationship).
const PUBLIC = [
  "achievements",
  "answer_types",
  "custom_playlist_tracks",
  "custom_playlists",
  "daily_results",
  "daily_songs",
  "game_players",
  "game_results",
  "games",
  "pro_subscriptions",
  "profiles",
  "room_playlists",
  "rooms",
  "salon_players",
  "track_answers",
  "track_issues",
  "track_stats",
  "tracks",
  "user_achievements",
  "weekly_challenge_contributions",
  "weekly_challenges",
  "zikle_pool",
];
const SCHEMA_OF = {
  ...Object.fromEntries(PUBLIC.map((t) => [t, "public"])),
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
  health_checks: "ops",
  errors: "ops",
  snapshots: "salon",
  card_albums: "cards",
  card_artists: "cards",
  card_grants: "cards",
  card_set_items: "cards",
  card_sets: "cards",
  card_signals: "cards",
  cards: "cards",
  user_card_sets: "cards",
  user_cards: "cards",
  card_view: "cards",
};
// Fonctions de lien qui portent le nom d’une table d’un autre schéma
const LINKS = new Set(["public.cards"]);

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory())
      return name === "__tests__" || name === "node_modules" ? [] : files(path);
    return /\.(js|mjs|svelte)$/.test(name) ? [path] : [];
  });
}

const QUERY =
  /(?:\.schema\(\s*["'`](\w+)["'`]\s*\)\s*)?\.from\(\s*["'`](\w+)["'`]\s*\)(?:(?:(?!\.from\()[\s\S])*?\.select\(\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`))?/g;
const EMBED = /(?:\w+:)?(\w+)(?:!\w+)?\s*\(/g;

function wrongSchemaCalls(source) {
  const bad = [];
  for (const [, schema = "public", table, ...selects] of source.matchAll(
    QUERY,
  )) {
    const want = SCHEMA_OF[table];
    if (!want) continue;
    if (want !== schema) bad.push(table);
    const cols = selects.find((c) => c !== undefined) ?? "";
    for (const [, name] of cols.matchAll(EMBED))
      if (
        SCHEMA_OF[name] &&
        SCHEMA_OF[name] !== want &&
        !LINKS.has(`${want}.${name}`)
      )
        bad.push(`${want} -> ${name}`);
  }
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
    expect(wrongSchemaCalls('sb.schema("social").from("profiles")')).toEqual([
      "profiles",
    ]);
  });

  it("repère une jointure vers un autre schéma", () => {
    expect(
      wrongSchemaCalls(
        'sb.schema("social").from("follows").select("id, user:profiles!follows_fkey(id)")',
      ),
    ).toEqual(["social -> profiles"]);
    expect(
      wrongSchemaCalls('sb.from("profiles").select("id, follows(id)")'),
    ).toEqual(["public -> follows"]);
    expect(
      wrongSchemaCalls(
        'sb.schema("ops").from("prospect_replies").select("id, prospects(name)")',
      ),
    ).toEqual([]);
    expect(
      wrongSchemaCalls(
        'sb.schema("social").from("follows").select("id, user:following(id)")',
      ),
    ).toEqual([]);
    expect(
      wrongSchemaCalls("sb.from('tracks').select('id, cards(number)')"),
    ).toEqual([]);
    expect(
      wrongSchemaCalls("sb.from('tracks').select('id, user_cards(card_id)')"),
    ).toEqual(["public -> user_cards"]);
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
