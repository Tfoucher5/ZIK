import { describe, it, expect } from "vitest";
import { buildSessionPlaylist } from "../socket/salon.js";

const pool = (n) =>
  Array.from({ length: n }, (_, i) => ({ artist: `A${i}`, title: `T${i}` }));

describe("buildSessionPlaylist", () => {
  it("tire exactement le nombre de manches demandé", () => {
    expect(buildSessionPlaylist(pool(50), 10)).toHaveLength(10);
  });

  it("se limite au pool quand il est plus court que la partie", () => {
    expect(buildSessionPlaylist(pool(4), 10)).toHaveLength(4);
  });

  it("rend une liste vide quand il ne reste aucune manche", () => {
    expect(buildSessionPlaylist(pool(20), 0)).toEqual([]);
    expect(buildSessionPlaylist(pool(20), -3)).toEqual([]);
  });

  it("ne répète pas un titre dans la même session", () => {
    const session = buildSessionPlaylist(pool(30), 20);
    expect(new Set(session.map((t) => t.title)).size).toBe(20);
  });

  it("ne modifie pas le pool d'origine", () => {
    const full = pool(10);
    const copy = [...full];
    buildSessionPlaylist(full, 5);
    expect(full).toEqual(copy);
  });

  it("ne rend pas toujours le même tirage", () => {
    const full = pool(40);
    const runs = new Set(
      Array.from({ length: 12 }, () =>
        buildSessionPlaylist(full, 8)
          .map((t) => t.title)
          .join(","),
      ),
    );
    expect(runs.size).toBeGreaterThan(1);
  });
});
