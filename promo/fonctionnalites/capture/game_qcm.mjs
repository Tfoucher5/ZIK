import { chromium } from "playwright-core";
import { URL, sleep, answer, strip, startBots, record } from "./lib.mjs";
const [room, out, rounds = 3] = process.argv.slice(2);
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
await p.goto(`${URL}/game?roomId=${room}&username=Toi&isGuest=1&gameMode=qcm`, {
  waitUntil: "networkidle",
});
await sleep(1000);
const stopBots = startBots(
  room,
  [
    { name: "Julie", a: [3, 6], miss: 0.1 },
    { name: "Karim", a: [4, 9], miss: 0.1 },
    { name: "Lisa", a: [6, 12], miss: 0.15 },
  ],
  { qcm: true },
);
const rec = await record(p, out, { maxWidth: 1075, maxHeight: 2330 });
for (let r = 0; r < rounds; r++) {
  await p.waitForFunction(
    () =>
      [...document.querySelectorAll("button")].filter(
        (x) => !x.disabled && / — /.test(x.innerText),
      ).length >= 2,
    null,
    { timeout: 90000 },
  );
  rec.mark("round" + (r + 1));
  const ans = answer();
  await sleep([1800, 2600, 1500][r % 3]);
  const res = await p.evaluate((t) => {
    const bs = [...document.querySelectorAll("button")].filter(
      (x) => !x.disabled && / — /.test(x.innerText),
    );
    const i = bs.findIndex((x) => x.innerText.toLowerCase().includes(t));
    if (i >= 0) bs[i].click();
    return [i, bs.map((x) => x.innerText.replace(/\n/g, " "))];
  }, strip(ans.t).toLowerCase());
  console.log(r, ans.t, res);
  rec.mark("tap" + (r + 1));
  await p
    .waitForFunction(
      () =>
        ![...document.querySelectorAll("button")].some(
          (x) => !x.disabled && / — /.test(x.innerText),
        ),
      null,
      { timeout: 60000 },
    )
    .catch(() => {});
  rec.mark("end" + (r + 1));
}
await sleep(8000);
console.log("frames", await rec.stop());
stopBots();
await b.close();
