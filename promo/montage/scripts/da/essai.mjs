// Essai jetable : planche du rush (node scripts/da/essai.mjs <début> <fin> <pas> <sortie> [largeur])
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const [out, w, ...T] = process.argv.slice(2);
const idx = JSON.parse(readFileSync("public/rec/lot1-partie/index.json", "utf8")).frames;
const at = (t) => idx.reduce((p, c) => (Math.abs(c[1] - t) < Math.abs(p[1] - t) ? c : p))[0];
let h = "";
for (const t0 of T) { const t = +t0;
  h += `<div style="position:relative"><img src="${pathToFileURL("public/rec/lot1-partie/" + at(t))}" style="width:${w}px;display:block"><b style="position:absolute;left:2px;top:2px;background:#ff0;font:14px monospace">${t.toFixed(1)}</b></div>`; }
const br = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await br.newPage({ viewport: { width: 1900, height: 500 } });
const f = "out/lot1-da/essais/_p.html";
(await import("node:fs")).writeFileSync(f, `<body style="margin:0;display:flex;flex-wrap:wrap;gap:4px;background:#333">${h}</body>`);
await p.goto(pathToFileURL(f).href);
await p.screenshot({ path: out, fullPage: true });
await br.close();
