import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { URL, sleep } from "./lib.mjs";
const b = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium",
  args: ["--hide-scrollbars"],
});
for (const spec of process.argv.slice(2)) {
  const [name, path, theme] = spec.split("|");
  const ctx = await b.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2.5,
    hasTouch: true,
    locale: "fr-FR",
  });
  if (theme)
    await ctx.addInitScript((t) => localStorage.setItem("zik_theme", t), theme);
  const p = await ctx.newPage();
  await p.goto(URL + path, { waitUntil: "networkidle" });
  await sleep(1500);
  await p.addStyleTag({
    content:
      '.tab-bar, nav.tabbar, [class*="tabbar"], [class*="tab-bar"], [class*="bottom-nav"] { display: none !important; } * { animation-play-state: paused !important; }',
  });
  const dir = `${process.env.REC_DIR || "rec"}/${name}`;
  mkdirSync(dir, { recursive: true });
  const h0 = await p.evaluate(() => document.documentElement.scrollHeight);
  const buf = await p.screenshot({
    fullPage: true,
    clip: { x: 0, y: 0, width: 430, height: h0 },
    type: "jpeg",
    quality: 92,
  });
  writeFileSync(`${dir}/f00000.jpg`, buf);
  writeFileSync(
    `${dir}/index.json`,
    JSON.stringify({ frames: [{ f: "f00000.jpg", t: 0 }], marks: [] }),
  );
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  writeFileSync(
    `${dir}/dim.json`,
    JSON.stringify({ w: 1075, h: Math.round(h * 2.5) }),
  );
  console.log(name, h);
  await ctx.close();
}
await b.close();
