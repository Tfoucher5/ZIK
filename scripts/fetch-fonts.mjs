// Télécharge les woff2 Google Fonts (latin + latin-ext) vers static/fonts/
// et génère static/css/fonts.css avec des URLs locales. À lancer une fois :
//   node scripts/fetch-fonts.mjs
import { writeFileSync, mkdirSync } from "fs";

const CSS_URL =
  "https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;0,900;1,900&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const KEEP = new Set(["latin", "latin-ext"]);

const css = await (
  await fetch(CSS_URL, { headers: { "User-Agent": UA } })
).text();

mkdirSync("static/fonts", { recursive: true });

const blocks = [
  ...css.matchAll(/\/\* ([a-z-]+) \*\/\s*(@font-face\s*\{[^}]*\})/g),
];
if (!blocks.length)
  throw new Error("Aucun bloc @font-face trouvé — UA refusée ?");

let out = "/* Fonts self-hostées — générées par scripts/fetch-fonts.mjs */\n";
for (const [, subset, block] of blocks) {
  if (!KEEP.has(subset)) continue;
  const url = block.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
  if (!url) continue;
  const family = block.match(/font-family:\s*'([^']+)'/)[1];
  const weight = block.match(/font-weight:\s*(\d+)/)[1];
  const style = block.match(/font-style:\s*(\w+)/)[1];
  const fname = `${family.toLowerCase().replace(/ /g, "-")}-${weight}${style === "italic" ? "i" : ""}-${subset}.woff2`;
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(`static/fonts/${fname}`, buf);
  out += `/* ${subset} */\n${block.replace(url, `/fonts/${fname}`)}\n`;
  console.log(`${fname} : ${buf.length} o`);
}
writeFileSync("static/css/fonts.css", out);
console.log("static/css/fonts.css généré");
