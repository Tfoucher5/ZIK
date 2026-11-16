import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Le CSS est servi en cache immutable 1 an : un ?v= figé sert l'ancien CSS
// après déploiement. La version vient de $app/environment (une par build).
const SRC = join(import.meta.dirname, "../../..");
const HARD_CODED = /\.css\?v=\d/;

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return e.name === "__tests__" ? [] : files(p);
    return /\.(svelte|html|js)$/.test(e.name) ? [p] : [];
  });
}

describe("version du CSS", () => {
  it("aucun .css?v=<chiffre> tapé à la main dans src", () => {
    const fautifs = files(SRC).filter((f) =>
      HARD_CODED.test(readFileSync(f, "utf8")),
    );
    expect(fautifs).toEqual([]);
  });

  it("app.html porte le jeton remplacé par hooks.server.js", () => {
    const app = readFileSync(join(SRC, "app.html"), "utf8");
    expect(app).toContain("theme.css?v=%zik.version%");
  });
});
