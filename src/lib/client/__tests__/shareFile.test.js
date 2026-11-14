import { describe, it, expect, vi, afterEach } from "vitest";
import { shareFile } from "../shareFile.js";
import { shareStory } from "../../components/salon/play/podiumStory.js";

const file = { name: "zik-podium.png" };
const nav = (share, canShare = () => true) =>
  vi.stubGlobal("navigator", { canShare, share });

afterEach(() => vi.unstubAllGlobals());

describe("partage d'un fichier", () => {
  it("menu de partage accepté : shared", async () => {
    nav(async () => {});
    expect(await shareFile(file, "t")).toBe("shared");
  });

  it("menu fermé par la personne : cancelled", async () => {
    nav(async () => {
      throw Object.assign(new Error(), { name: "AbortError" });
    });
    expect(await shareFile(file, "t")).toBe("cancelled");
  });

  it("partage refusé ou indisponible : null, l'appelant propose autre chose", async () => {
    nav(async () => {
      throw Object.assign(new Error(), { name: "NotAllowedError" });
    });
    expect(await shareFile(file, "t")).toBeNull();
    nav(async () => {}, null);
    expect(await shareFile(file, "t")).toBeNull();
  });

  it("story sans partage possible : l'image est téléchargée", async () => {
    nav(
      async () => {},
      () => false,
    );
    const a = { click: vi.fn() };
    vi.stubGlobal("document", { createElement: () => a });
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:x",
      revokeObjectURL: () => {},
    });
    expect(await shareStory(file)).toBe("downloaded");
    expect(a.download).toBe("zik-podium.png");
    expect(a.click).toHaveBeenCalled();
  });
});
