import { execFile } from "child_process";
import { mkdirSync, renameSync, writeFileSync } from "fs";
import { dirname } from "path";
import { promisify } from "util";
import { YTDLP_BIN } from "./ytdlAudio.js";

const execFileAsync = promisify(execFile);
const RELEASES = "https://github.com/yt-dlp/yt-dlp/releases/latest";
const TIMEOUT_MS = 120_000;

function assetName() {
  if (process.platform === "win32") return "yt-dlp.exe";
  return process.arch === "arm64" ? "yt-dlp_linux_aarch64" : "yt-dlp_linux";
}

async function installedVersion(bin) {
  try {
    const { stdout } = await execFileAsync(bin, ["--version"], {
      timeout: 5000,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

// Sans l'API GitHub, qui refuse les appels sans jeton : le lien « latest »
// redirige vers la page de la dernière version
async function latestVersion() {
  const res = await fetch(RELEASES, {
    method: "HEAD",
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return res.headers.get("location")?.match(/\/tag\/([^/]+)$/)?.[1] ?? null;
}

async function download(bin) {
  const dl = await fetch(`${RELEASES}/download/${assetName()}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!dl.ok) throw new Error(`HTTP ${dl.status}`);
  const binary = Buffer.from(await dl.arrayBuffer());
  mkdirSync(dirname(bin), { recursive: true });
  // Le binaire peut tourner : on ne l'écrase jamais à moitié
  writeFileSync(`${bin}.tmp`, binary, { mode: 0o755 });
  renameSync(`${bin}.tmp`, bin);
}

/** Installe yt-dlp s'il manque, le met à jour s'il est dépassé. Ne lève jamais. */
export async function autoUpdateYtDlp(bin = YTDLP_BIN) {
  try {
    const current = await installedVersion(bin);
    if (!current) {
      console.warn("[yt-dlp] absent, installation");
    } else {
      const latest = await latestVersion();
      if (!latest || current === latest) {
        console.log(`[yt-dlp] à jour (${current})`);
        return;
      }
      console.log(`[yt-dlp] mise à jour ${current} → ${latest}`);
    }
    await download(bin);
    console.log("[yt-dlp] installé");
  } catch (e) {
    console.warn("[yt-dlp] auto-update ignoré :", e.message);
  }
}
