// Planche de contrôle d'images fixes avec la zone sûre : node scripts/planche.mjs <sortie.png> <largeur> <hauteur> <x,y,l,h> <images…>
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const [out, w, h, zone, ...files] = process.argv.slice(2);
const sc = 360 / +w;
const [zx, zy, zw, zh] = zone.split(",").map((n) => +n * sc);
const html = `<body style="margin:0;background:#333;display:flex;flex-wrap:wrap;gap:8px;padding:8px">${files.map((f) => `<div style="position:relative;width:360px;height:${h * sc}px"><img src="data:image/png;base64,${readFileSync(f).toString("base64")}" style="width:100%;height:100%"><div style="position:absolute;left:${zx}px;top:${zy}px;width:${zw}px;height:${zh}px;border:2px dashed #0f0"></div></div>`).join("")}</body>`;
const b = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const p = await b.newPage({ viewport: { width: 4 * 368 + 8, height: 400 } });
await p.setContent(html);
await p.screenshot({ path: out, fullPage: true });
await b.close();
