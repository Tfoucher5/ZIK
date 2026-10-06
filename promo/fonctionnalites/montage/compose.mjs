import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const REC = resolve(process.env.REC_DIR || "rec");
const FONTS = resolve(
  process.env.FONTS_DIR || resolve(here, "../../../static/fonts"),
);
const [specFile, out, stillsArg] = process.argv.slice(2);
const spec = (await import(pathToFileURL(resolve(specFile)).href)).default;
const recs = {};
const need = new Set(
  [
    ...spec.shots.flatMap((s) => [
      s.rec,
      ...(s.panels || []).map((p) => p.rec),
    ]),
    spec.outro?.rec,
  ].filter(Boolean),
);
for (const r of need)
  recs[r] = {
    frames: JSON.parse(readFileSync(`${REC}/${r}/index.json`, "utf8")).frames,
    ...JSON.parse(readFileSync(`${REC}/${r}/dim.json`, "utf8")),
  };
const html = resolve(here, ".composer.run.html");
writeFileSync(
  html,
  readFileSync(resolve(here, "composer.html"), "utf8").replaceAll(
    "FONTS/",
    pathToFileURL(FONTS).href + "/",
  ),
);
const b = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium",
  args: ["--allow-file-access-from-files"],
});
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto(pathToFileURL(html).href);
await p.evaluate(
  ([s, r, d]) => window.build(s, r, d),
  [spec, recs, pathToFileURL(REC).href],
);
await p.evaluate(() => document.fonts.ready);
if (stillsArg) {
  for (const t of stillsArg.split(",").map(Number)) {
    await p.evaluate((t) => window.render(t), t);
    await p.screenshot({ path: `${out}_${t}.png` });
  }
  await b.close();
  process.exit(0);
}
const fps = 30;
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
