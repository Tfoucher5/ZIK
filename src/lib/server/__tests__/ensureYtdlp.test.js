import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPT = resolve("scripts/ensure-ytdlp.mjs");
const BIN = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";

// Lance le vrai script dans un dossier vide, fetch remplacé : jamais de réseau
function run(cwd, fetchBody) {
  const stub = `globalThis.fetch = async (url) => { console.log("FETCH " + url); ${fetchBody} };`;
  return spawnSync(
    process.execPath,
    ["--import", `data:text/javascript,${encodeURIComponent(stub)}`, SCRIPT],
    { cwd, encoding: "utf8" },
  );
}

describe("scripts/ensure-ytdlp.mjs", () => {
  let cwd;
  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "ytdlp-"));
  });
  afterEach(() => rmSync(cwd, { recursive: true, force: true }));

  it("binaire déjà là : aucun téléchargement", () => {
    mkdirSync(join(cwd, "bin"));
    writeFileSync(join(cwd, "bin", BIN), "x");
    const r = run(cwd, `throw new Error("interdit");`);
    expect(r.status).toBe(0);
    expect(r.stdout).not.toContain("FETCH");
  });

  it("télécharge par le lien direct, sans l'API GitHub", () => {
    const r = run(cwd, `return new Response("binaire");`);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(
      "FETCH https://github.com/yt-dlp/yt-dlp/releases/latest/download/",
    );
    expect(r.stdout).not.toContain("api.github.com");
    expect(existsSync(join(cwd, "bin", BIN))).toBe(true);
  });

  it.each([
    ["réponse 403", `return new Response("non", { status: 403 });`],
    ["réseau coupé", `throw new Error("réseau");`],
  ])("%s : le build continue, sans binaire vide", (_, body) => {
    const r = run(cwd, body);
    expect(r.status).toBe(0);
    expect(r.stderr).toContain("NOT INSTALLED");
    expect(existsSync(join(cwd, "bin", BIN))).toBe(false);
  });
});
