// Enregistre index.html image par image et l'assemble en MP4 vertical.
// Usage : node render.mjs [sortie.mp4] [--fps 60] [--stills 1,4.5,12]
//   --stills : n'exporte que quelques images PNG (contrôle de mise en page)
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";
import ffmpegPath from "ffmpeg-static";

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const out = resolve(
  args.find((a) => a.endsWith(".mp4")) || "zik-presentation.mp4",
);
const fps = Number(opt("fps", 60));
const stills = opt("stills", null);

const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--allow-file-access-from-files", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(resolve("index.html")).href, {
  waitUntil: "load",
});
await page.evaluate(() => window.ready);
const duration = await page.evaluate(() => window.DURATION);

if (stills) {
  mkdirSync("stills", { recursive: true });
  for (const t of stills.split(",").map(Number)) {
    await page.evaluate((t) => window.render(t), t);
    await page.screenshot({
      path: `stills/t${String(t).replace(".", "_")}.png`,
    });
  }
  await browser.close();
  process.exit(0);
}

const ff = spawn(
  ffmpegPath,
  [
    "-y",
    "-f",
    "image2pipe",
    "-framerate",
    String(fps),
    "-i",
    "-",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-shortest",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "slow",
    "-crf",
    "17",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    out,
  ],
  { stdio: ["pipe", "inherit", "inherit"] },
);

const frames = Math.round(duration * fps);
const started = Date.now();
for (let f = 0; f < frames; f++) {
  await page.evaluate((t) => window.render(t), f / fps);
  const buf = await page.screenshot({ type: "jpeg", quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (f % (fps * 5) === 0)
    console.log(
      `${(f / fps).toFixed(0)} s / ${duration} s (${((Date.now() - started) / 1000).toFixed(0)} s écoulées)`,
    );
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log(`Vidéo prête : ${out}`);
