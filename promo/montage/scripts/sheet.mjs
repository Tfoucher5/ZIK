// Planche contact des images de contrôle : node scripts/sheet.mjs <composition> 20,75,130 → out/stills/<composition>-sheet.png
// Rend chaque frame (échelle 0,4), les aligne et trace la zone sûre TikTok en pointillés.
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const [id, list] = process.argv.slice(2);
const frames = list.split(",").map(Number);
mkdirSync("out/stills", { recursive: true });
for (const fr of frames)
  execSync(
    `npx remotion still ${id} out/stills/${id}-${fr}.png --frame=${fr} --scale=0.4 --log=error`,
    { stdio: "ignore" },
  );

const img = (fr) =>
  `data:image/png;base64,${readFileSync(`out/stills/${id}-${fr}.png`).toString("base64")}`;
const html = `<body style="margin:0;background:#222;display:flex;gap:8px;padding:8px;font:14px sans-serif;color:#fff">${frames
  .map(
    (fr) => `<div><div style="position:relative;width:432px;height:768px">
      <img src="${img(fr)}" style="width:432px;height:768px;display:block">
      <div style="position:absolute;left:24px;top:64px;width:352px;height:528px;border:2px dashed #0f0"></div>
    </div>frame ${fr}</div>`,
  )
  .join("")}</body>`;
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({
  viewport: { width: frames.length * 440 + 8, height: 800 },
});
await page.setContent(html);
await page.screenshot({ path: `out/stills/${id}-sheet.png` });
await browser.close();
console.log(`out/stills/${id}-sheet.png`);
