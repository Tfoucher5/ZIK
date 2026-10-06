import { chromium } from "playwright-core";
import {
  URL,
  sleep,
  answer,
  strip,
  startBots,
  record,
  typeLikeHuman,
} from "./lib.mjs";
const [room, out, rounds = 3] = process.argv.slice(2);
const b = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium",
  args: [
    "--autoplay-policy=no-user-gesture-required",
    `--force-device-scale-factor=${process.env.TABLET ? 1.3 : 2.5}`,
  ],
});
const ctx = await b.newContext({
  viewport: process.env.TABLET
    ? { width: 820, height: 1180 }
    : { width: 430, height: 932 },
  hasTouch: true,
  locale: "fr-FR",
});
if (process.env.THEME)
  await ctx.addInitScript(
    (t) => localStorage.setItem("zik_theme", t),
    process.env.THEME,
  );
const p = await ctx.newPage();
await p.goto(
  `${URL}/game?roomId=${room}&username=Toi&isGuest=1&gameMode=classic`,
  { waitUntil: "networkidle" },
);
await sleep(1000);
const stopBots = startBots(room, [
  process.env.TABLET
    ? { name: "Julie", a: [1.8, 2.6], t: [3.2, 4.2], miss: 0 }
    : { name: "Julie", a: [3.5, 5], t: [7, 9], miss: 0.1 },
  { name: "Karim", a: [5, 8], t: [10, 14], miss: 0.1 },
  { name: "Lisa", a: [9, 14], t: [15, 20], miss: 0.2 },
]);
await sleep(1500);
const rec = await record(p, out, { maxWidth: 1075, maxHeight: 2330 });
await sleep(1200);
rec.mark("start");
await p
  .getByText("Lancer la partie")
  .click({ timeout: 3000 })
  .catch(() => {});
for (let r = 0; r < rounds; r++) {
  await p.waitForFunction(
    () => !document.getElementById("guessInput")?.disabled,
    null,
    { timeout: 60000 },
  );
  rec.mark("round" + (r + 1));
  const ans = answer();
  console.log("round", r + 1, ans);
  await sleep(
    process.env.TABLET ? (r === 0 ? 5200 : 900) : r === 1 ? 2500 : 1500,
  );
  await typeLikeHuman(p, "#guessInput", strip(ans.a).toLowerCase());
  await p.keyboard.press("Enter");
  rec.mark("artist" + (r + 1));
  await sleep(process.env.TABLET ? 500 : r === 1 ? 2500 : 900);
  await typeLikeHuman(p, "#guessInput", strip(ans.t).toLowerCase());
  await p.keyboard.press("Enter");
  rec.mark("title" + (r + 1));
  await p.waitForFunction(
    () => document.getElementById("guessInput")?.disabled,
    null,
    { timeout: 60000 },
  );
  rec.mark("end" + (r + 1));
}
await sleep(9000);
console.log("frames", await rec.stop());
stopBots();
await b.close();
