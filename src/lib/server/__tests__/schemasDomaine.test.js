import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ROOM_PLAYLISTS_SELECT } from "../services/rooms/roomList.js";

// Schéma de chaque table (phase 4 du plan). Une table hors de public se lit
// par .schema("…") ; une jointure ne vise qu'une table du même schéma
// (PostgREST ne suit pas une clé étrangère d'un schéma à l'autre, PGRST200),
// sinon elle passe par une fonction de lien (computed relationship).
const PUBLIC = ["pro_subscriptions", "profiles", "salon_players"];
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
  achievements: "play",
  daily_results: "play",
  daily_songs: "play",
  game_players: "play",
  game_results: "play",
  games: "play",
  room_playlists: "play",
  rooms: "play",
  user_achievements: "play",
  weekly_challenge_contributions: "play",
  weekly_challenges: "play",
  zikle_pool: "play",
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
  tracks: "catalog",
  custom_playlists: "catalog",
  custom_playlist_tracks: "catalog",
  track_answers: "catalog",
  answer_types: "catalog",
  track_stats: "catalog",
  track_issues: "catalog",
};
// Fonctions de lien (computed relationships), chacune dans son schéma de départ
const LINKS = new Set([
  "social.following",
  "social.follower",
  "social.requester",
  "social.addressee",
  "social.actor",
  "social.profile",
  "cards.first_owner",
  "catalog.owner",
  "catalog.cards",
  "play.tracks",
  "play.owner",
  "play.profile",
  "play.top_contributor",
  "play.custom_playlists",
  "public.games",
]);
const LINK_NAMES = new Set([...LINKS].map((l) => l.split(".")[1]));
// Fonctions SQL appelées par .rpc, rangées hors de public
const RPC_SCHEMA = {
  card_settle: "cards",
  cards_leaderboard: "cards",
  cards_leaderboard_my_rank: "cards",
  cards_showcase: "cards",
  get_covers_by_playlists: "catalog",
  record_round_stats: "catalog",
  report_track_issue: "catalog",
  resolve_tracks: "catalog",
  increment_weekly_challenge: "play",
  leaderboard_score: "play",
  leaderboard_score_my_rank: "play",
  pick_daily_song: "play",
  pick_weekly_challenge: "play",
  weekly_leaderboard: "play",
  weekly_leaderboard_by_room: "play",
  zikle_complete: "play",
  zikle_leaderboard: "play",
};
const RPC =
  /(?:\.schema\(\s*["'`](\w+)["'`]\s*\)\s*)?\.rpc\(\s*["'`](\w+)["'`]/g;

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
    for (const [, name] of cols.matchAll(EMBED)) {
      const cross = SCHEMA_OF[name]
        ? SCHEMA_OF[name] !== want
        : LINK_NAMES.has(name);
      if (cross && !LINKS.has(`${want}.${name}`))
        bad.push(`${want} -> ${name}`);
    }
  }
  for (const [, schema = "public", fn] of source.matchAll(RPC))
    if (RPC_SCHEMA[fn] && RPC_SCHEMA[fn] !== schema) bad.push(`rpc ${fn}`);
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
      wrongSchemaCalls('sb.from("profiles").select("id, x:owner(id)")'),
    ).toEqual(["public -> owner"]);
    expect(
      wrongSchemaCalls(
        'sb.schema("catalog").from("custom_playlists").select("id, profiles:owner(id)")',
      ),
    ).toEqual([]);
    expect(
      wrongSchemaCalls(
        "sb.schema('catalog').from('tracks').select('id, cards(number)')",
      ),
    ).toEqual([]);
    expect(
      wrongSchemaCalls(
        "sb.schema('catalog').from('tracks').select('id, user_cards(card_id)')",
      ),
    ).toEqual(["catalog -> user_cards"]);
  });

  it("repère un rpc sans son schéma", () => {
    expect(wrongSchemaCalls('sb.rpc("card_settle", {})')).toEqual([
      "rpc card_settle",
    ]);
    expect(
      wrongSchemaCalls('sb\n  .schema("cards")\n  .rpc("card_settle", {})'),
    ).toEqual([]);
    expect(wrongSchemaCalls('sb.rpc("admin_pulse")')).toEqual([]);
  });

  it("la sélection partagée des playlists d'une room reste dans play", () => {
    expect(
      wrongSchemaCalls(
        `sb.schema("play").from("rooms").select("id, ${ROOM_PLAYLISTS_SELECT}")`,
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
