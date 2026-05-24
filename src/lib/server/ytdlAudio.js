import { execFile } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { ytdlAudioCache } from "./ytdlCache.js";

const execFileAsync = promisify(execFile);

export const YTDLP_BIN =
  process.env.YOUTUBE_DL_PATH ||
  join(
    process.cwd(),
    "bin",
    process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp",
  );

export const YTDL_TTL = 2 * 60 * 60 * 1000;

export async function getYtAudioUrl(videoId) {
  const cached = ytdlAudioCache.get(videoId);
  if (cached && Date.now() - cached.fetchedAt < YTDL_TTL) return cached;
  const { stdout } = await execFileAsync(
    YTDLP_BIN,
    [
      `https://www.youtube.com/watch?v=${videoId}`,
      "--format",
      "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio",
      "-j",
      "--no-playlist",
      "--no-warnings",
      "--socket-timeout",
      "8",
      "--retries",
      "0",
    ],
    { timeout: 10000, maxBuffer: 20 * 1024 * 1024 },
  );
  const info = JSON.parse(stdout);
  const entry = {
    url: info.url,
    mimeType: `audio/${info.ext || "webm"}`,
    fetchedAt: Date.now(),
  };
  ytdlAudioCache.set(videoId, entry);
  return entry;
}
