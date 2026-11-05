import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const m = vi.hoisted(() => ({ version: null }));

vi.mock("child_process", async (original) => ({
  ...(await original()),
  execFile: (_bin, _args, _opts, cb) =>
    m.version
      ? cb(null, { stdout: `${m.version}\n`, stderr: "" })
      : cb(new Error("ENOENT")),
}));

const { autoUpdateYtDlp } = await import("../ytdlpUpdate.js");

const redirection = (tag) =>
  new Response(null, {
    status: 302,
    headers: {
      location: `https://github.com/yt-dlp/yt-dlp/releases/tag/${tag}`,
    },
  });

describe("autoUpdateYtDlp", () => {
  let dir, bin, warn, f;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ytdlp-"));
    bin = join(dir, "bin", "yt-dlp");
    m.version = null;
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    f = vi.fn();
    vi.stubGlobal("fetch", f);
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  const urls = () => f.mock.calls.map(([url]) => url);

  it("binaire absent : installé au premier passage, dossier créé", async () => {
    f.mockResolvedValue(new Response("binaire"));
    await autoUpdateYtDlp(bin);
    expect(readFileSync(bin, "utf8")).toBe("binaire");
    expect(urls()[0]).toContain("/releases/latest/download/");
    expect(existsSync(`${bin}.tmp`)).toBe(false);
  });

  it("déjà à jour : rien de téléchargé", async () => {
    m.version = "2026.10.26";
    f.mockResolvedValue(redirection("2026.10.26"));
    await autoUpdateYtDlp(bin);
    expect(f).toHaveBeenCalledOnce();
    expect(existsSync(bin)).toBe(false);
  });

  it("nouvelle version : remplace le binaire", async () => {
    m.version = "2026.01.01";
    f.mockResolvedValueOnce(redirection("2026.10.26")).mockResolvedValueOnce(
      new Response("nouveau"),
    );
    await autoUpdateYtDlp(bin);
    expect(readFileSync(bin, "utf8")).toBe("nouveau");
  });

  it("n'utilise jamais l'API GitHub", async () => {
    m.version = "2026.01.01";
    f.mockResolvedValueOnce(redirection("2026.10.26")).mockResolvedValueOnce(
      new Response("nouveau"),
    );
    await autoUpdateYtDlp(bin);
    expect(urls().join()).not.toContain("api.github.com");
  });

  it("version la plus récente inconnue : le binaire reste", async () => {
    m.version = "2026.01.01";
    f.mockResolvedValue(new Response(null, { status: 403 }));
    await autoUpdateYtDlp(bin);
    expect(f).toHaveBeenCalledOnce();
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([
    ["réponse d'erreur", async () => new Response("non", { status: 403 })],
    [
      "réseau coupé",
      async () => {
        throw new Error("réseau");
      },
    ],
  ])("%s : aucun fichier écrit, et pas d'exception", async (_, reponse) => {
    f.mockImplementation(reponse);
    await expect(autoUpdateYtDlp(bin)).resolves.toBeUndefined();
    expect(existsSync(bin)).toBe(false);
    expect(warn).toHaveBeenCalledWith(
      "[yt-dlp] auto-update ignoré :",
      expect.any(String),
    );
  });
});
