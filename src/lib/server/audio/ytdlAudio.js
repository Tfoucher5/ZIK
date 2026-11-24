import { join } from "path";

export const YTDLP_BIN =
  process.env.YOUTUBE_DL_PATH ||
  join(
    process.cwd(),
    "bin",
    process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp",
  );
