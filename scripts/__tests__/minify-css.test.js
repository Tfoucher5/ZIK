import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { withMinifiedCss } from "../minify-css.mjs";

describe("withMinifiedCss", () => {
  it("minifie les CSS de la sortie client avant que l'adapter ne les mesure", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "zik-css-"));
    const css = join(outDir, "output/client/css");
    mkdirSync(join(css, "salon"), { recursive: true });
    writeFileSync(join(css, "a.css"), "/* note */\n.a {\n  color: red;\n}\n");
    writeFileSync(join(css, "salon/b.css"), ".b {\n  margin: 0px;\n}\n");
    let seen;
    const adapter = withMinifiedCss({
      name: "fake",
      adapt: () => (seen = readFileSync(join(css, "a.css"), "utf8")),
    });
    await adapter.adapt({ config: { outDir } });
    expect(adapter.name).toBe("fake");
    expect(seen).toBe(".a{color:red}\n");
    expect(readFileSync(join(css, "salon/b.css"), "utf8")).toBe(
      ".b{margin:0}\n",
    );
  });

  it("laisse passer un build sans dossier css", async () => {
    let called = false;
    const outDir = mkdtempSync(join(tmpdir(), "zik-css-"));
    await withMinifiedCss({ adapt: () => (called = true) }).adapt({
      config: { outDir },
    });
    expect(called).toBe(true);
  });
});
