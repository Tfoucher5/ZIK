import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve } from "node:path";
const REC = resolve(process.env.REC_DIR || "rec");
const here = fileURLToPath(new URL(".", import.meta.url));
const [specFile, out, stillsArg] = process.argv.slice(2);
const spec = (await import(pathToFileURL(resolve(specFile)).href)).default;
const recs = {};
const need = new Set(
  spec.scenes
    .flatMap((s) => [s.rec, s.bg?.rec, ...(s.extra || []).map((x) => x.rec)])
    .filter(Boolean),
);
for (const r of need) {
  const idx = JSON.parse(readFileSync(`${REC}/${r}/index.json`, "utf8"));
  const dim = JSON.parse(readFileSync(`${REC}/${r}/dim.json`, "utf8"));
  recs[r] = { frames: idx.frames, ...dim };
}
const b = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium",
  args: ["--allow-file-access-from-files"],
});
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto(pathToFileURL(here + "composer.html").href);
await p.evaluate(
  ([s, r, d]) => window.build(s, r, d),
  [spec, recs, pathToFileURL(REC).href],
);
await p.evaluate(() => document.fonts.ready);
const fps = 30;
if (stillsArg) {
  for (const t of stillsArg.split(",").map(Number)) {
    await p.evaluate((t) => window.render(t), t);
    await p.screenshot({ path: `${out}_${t}.png` });
  }
  await b.close();
  process.exit(0);
}
const ff = spawn(
  "ffmpeg",
  [
    "-y",
    "-loglevel",
    "error",
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
    "medium",
    "-crf",
    "18",
    "-r",
    String(fps),
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
const frames = Math.round(spec.duration * fps);
for (let f = 0; f < frames; f++) {
  await p.evaluate((t) => window.render(t), f / fps);
  const buf = await p.screenshot({ type: "jpeg", quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await b.close();
console.log("ok", out);
