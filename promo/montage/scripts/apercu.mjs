// Aperçu privé avec le son : colle l'extrait Deezer sur la vidéo déjà rendue (quelques secondes, sans re-rendu).
// node scripts/apercu.mjs <id> <son>   ex. node scripts/apercu.mjs pochettes ronisia
// out/zik-<id>.mp4 + public/ref/<son>.mp3 (à partir du 1er temps de mesure) → out/zik-<id>-apercu.mp4. Ne jamais poster ce fichier.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dir } from "@remotion/compositor-win32-x64-msvc";

const [id, son] = process.argv.slice(2);
const { bars } = JSON.parse(
  readFileSync(`public/ref/${son}.beats.json`, "utf8"),
);
execFileSync(
  `${dir}/ffmpeg.exe`,
  [
    "-v",
    "error",
    "-y",
    "-i",
    `out/zik-${id}.mp4`,
    "-ss",
    String(bars[0]),
    "-i",
    `public/ref/${son}.mp3`,
    "-map",
    "0:v",
    "-map",
    "1:a",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    `out/zik-${id}-apercu.mp4`,
  ],
  { stdio: "inherit" },
);
console.log(`out/zik-${id}-apercu.mp4`);
