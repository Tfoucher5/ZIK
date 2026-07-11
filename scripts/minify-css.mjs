// Minifie les CSS copiés depuis static/css vers build/client/css après le build,
// et régénère leurs .br/.gz (la précompression adapter a tourné avant, sur les non-minifiés).
import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { transform } from "esbuild";
import { gzipSync, brotliCompressSync, constants } from "zlib";

const dir = "build/client/css";
if (!existsSync(dir)) {
  console.error("build/client/css introuvable — lancer après vite build");
  process.exit(1);
}

for (const f of readdirSync(dir).filter((n) => n.endsWith(".css"))) {
  const p = join(dir, f);
  const src = readFileSync(p, "utf8");
  const { code } = await transform(src, { loader: "css", minify: true });
  writeFileSync(p, code);
  const buf = Buffer.from(code);
  const br = brotliCompressSync(buf, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  });
  writeFileSync(`${p}.gz`, gzipSync(buf, { level: 9 }));
  writeFileSync(`${p}.br`, br);
  console.log(`${f}: ${src.length} → ${code.length} o (br: ${br.length} o)`);
}
