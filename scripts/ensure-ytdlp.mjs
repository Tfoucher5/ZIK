import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

function getAssetName() {
  if (process.platform === "win32") return "yt-dlp.exe";
  if (process.platform === "linux") {
    return process.arch === "arm64" ? "yt-dlp_linux_aarch64" : "yt-dlp_linux";
  }
  if (process.platform === "darwin") {
    return process.arch === "arm64" ? "yt-dlp_macos" : "yt-dlp_macos_legacy";
  }
  return "yt-dlp_linux";
}

const binName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
const binDir = join(process.cwd(), "bin");
const binPath = join(binDir, binName);

if (existsSync(binPath)) {
  console.log("[yt-dlp] already present:", binPath);
  process.exit(0);
}

// Lien direct, sans l'API GitHub : l'API refuse (403) les appels sans jeton au
// build. Un binaire manquant ne doit pas bloquer une mise en prod : aucune
// partie n'en dépend, seule la recherche de vidéos en tâche de fond s'arrête.
const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${getAssetName()}`;
try {
  console.log("[yt-dlp] downloading", url);
  const dl = await fetch(url);
  if (!dl.ok) throw new Error(`HTTP ${dl.status}`);
  const binary = Buffer.from(await dl.arrayBuffer());
  mkdirSync(binDir, { recursive: true });
  writeFileSync(binPath, binary, { mode: 0o755 });
  console.log("[yt-dlp] installed at", binPath);
} catch (e) {
  console.warn("[yt-dlp] NOT INSTALLED, video search disabled:", e.message);
}
