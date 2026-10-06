import { chromium } from "playwright-core";
import { URL, sleep, record, typeLikeHuman } from "./lib.mjs";
const out = process.argv[2];
const b = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium",
  args: [
    "--autoplay-policy=no-user-gesture-required",
    "--force-device-scale-factor=2.5",
  ],
});
const ctx = await b.newContext({
  viewport: { width: 430, height: 932 },
  hasTouch: true,
  locale: "fr-FR",
});
if (process.env.THEME)
  await ctx.addInitScript(
    (t) => localStorage.setItem("zik_theme", t),
    process.env.THEME,
  );
const p = await ctx.newPage();
await p.goto(`${URL}/zikle`, { waitUntil: "networkidle" });
await sleep(800);
const rec = await record(p, out, { maxWidth: 1075, maxHeight: 2330 });
const inp = 'input[placeholder*="Titre ou artiste"]';
async function guess(q, pick) {
  await typeLikeHuman(p, inp, q);
  await sleep(1300);
  const sug = p.locator("button", { hasText: pick }).first();
  await sug.waitFor({ timeout: 8000 }).catch(() => console.log("no sug", pick));
  await sleep(500);
  await sug.click().catch(() => p.keyboard.press("Enter"));
}
await sleep(1200);
rec.mark("play1");
await p.locator(".zk-play").click();
await sleep(2200);
rec.mark("g1");
await guess("angèle", "Balance ton quoi");
await sleep(1800);
rec.mark("play2");
await p.locator(".zk-play").click();
await sleep(3000);
rec.mark("skip");
await p.locator(".zk-skip").click();
await sleep(1500);
rec.mark("play3");
await p.locator(".zk-play").click();
await sleep(4800);
rec.mark("g3");
await guess("alors on", "Alors on danse");
await sleep(2500);
rec.mark("win");
await p.mouse.wheel(0, 500);
await sleep(2500);
await p.mouse.wheel(0, 700);
await sleep(3000);
console.log("frames", await rec.stop());
await p.screenshot({ path: out + "_end.png" });
await b.close();
