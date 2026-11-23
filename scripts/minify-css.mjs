// Minifie les CSS copiés depuis static/css (et ses sous-dossiers) dans la sortie client,
// juste avant l'adapter : il les mesure et les précompresse (.br/.gz) ensuite
import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { transform } from "esbuild";

export function withMinifiedCss(adapter) {
  return {
    ...adapter,
    async adapt(builder) {
      const dir = join(builder.config.outDir, "output/client/css");
      if (existsSync(dir))
        for (const f of readdirSync(dir, { recursive: true }).filter((n) =>
          n.endsWith(".css"),
        )) {
          const p = join(dir, f);
          const { code } = await transform(readFileSync(p, "utf8"), {
            loader: "css",
            minify: true,
          });
          writeFileSync(p, code);
        }
      return adapter.adapt(builder);
    },
  };
}
