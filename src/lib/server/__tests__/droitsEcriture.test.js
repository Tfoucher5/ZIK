import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";

const DIR = "supabase/migrations";
const sql = readdirSync(DIR)
  .sort()
  .map((f) => readFileSync(`${DIR}/${f}`, "utf8"))
  .join("\n")
  .replace(/--.*$/gm, "");

// Dernières colonnes accordées au joueur, par action et par table
const grants = {};
for (const m of sql.matchAll(
  /grant (insert|update) \(([^)]+)\)\s+on table ([\w.]+) to authenticated;/g,
))
  grants[`${m[1]} ${m[3]}`] = m[2].split(",").map((c) => c.trim());

const SENSIBLES = ["is_official", "code", "track_count", "role", "elo", "xp"];

describe("droits d'écriture du joueur", () => {
  it("aucune colonne réservée au serveur n'est accordée", () => {
    for (const [cle, cols] of Object.entries(grants))
      for (const c of SENSIBLES) expect(cols, cle).not.toContain(c);
    expect(grants["update play.rooms"]).not.toContain("owner_id");
    expect(grants["insert social.friendships"]).not.toContain("status");
    expect(grants["update social.notifications"]).toEqual(["read"]);
  });

  it("la modification d'une room accorde exactement ce que la route écrit", () => {
    const route = readFileSync(
      "src/routes/(site)/api/rooms/[code]/+server.js",
      "utf8",
    );
    const allowed = [
      ...route.match(/const allowed = \[([^\]]+)\]/)[1].matchAll(/"(\w+)"/g),
    ].map((m) => m[1]);
    expect(grants["update play.rooms"].sort()).toEqual(
      [...allowed, "playlist_id"].sort(),
    );
  });

  it("la création d'une room accorde exactement ce que la route écrit", () => {
    const route = readFileSync(
      "src/routes/(site)/api/rooms/+server.js",
      "utf8",
    );
    const bloc = route.match(
      /\.from\("rooms"\)\s*\.insert\(\{([\s\S]*?)\n {4}\}\)/,
    )[1];
    const cles = [...bloc.matchAll(/^ {6}(\w+):/gm)].map((m) => m[1]);
    expect(grants["insert play.rooms"].sort()).toEqual(cles.sort());
  });

  it("les réponses de playlist ne s'écrivent que côté serveur", () => {
    const revoke = [
      ...sql.matchAll(/revoke ([\w, ]+) on table catalog\.track_answers/g),
    ].at(-1);
    expect(revoke[1]).toMatch(/insert/);
    expect(revoke[1]).toMatch(/update/);
    expect(revoke[1]).toMatch(/delete/);
    expect(grants["insert catalog.track_answers"]).toBeUndefined();
  });
});
