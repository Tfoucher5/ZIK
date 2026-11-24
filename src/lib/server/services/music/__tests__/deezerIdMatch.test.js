import { describe, it, expect, vi, beforeEach } from "vitest";

const dz = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("../deezerClient.js", () => ({ deezerFetch: dz.fetch }));

const { deezerIdMatch, deezerPreviewMatch } = await import("../deezer.js");

const r = (id, artist, title, preview = "https://cdn/x.mp3", version = "") => ({
  id,
  artist: { name: artist },
  title_short: title,
  title_version: version,
  preview,
});

describe("identifiant Deezer trouvé par nom", () => {
  beforeEach(() => dz.fetch.mockReset());

  it("garde l'id du résultat dont l'artiste et le titre correspondent", async () => {
    dz.fetch.mockResolvedValue({
      data: [r(1, "Karaoké Stars", "Papaoutai"), r(2, "Stromae", "Papaoutai")],
    });
    expect(await deezerIdMatch("Stromae", "Papaoutai")).toBe("2");
    expect(dz.fetch.mock.calls[0][1]).toEqual({ bulk: true });
  });

  it("autre version du même titre (live, remix) : refusée", async () => {
    dz.fetch.mockResolvedValue({
      data: [r(1, "Stromae", "Papaoutai", "https://cdn/x.mp3", "(Live)")],
    });
    expect(await deezerIdMatch("Stromae", "Papaoutai")).toBeNull();
  });

  it("extrait par nom : la version live reste acceptée en repli", async () => {
    dz.fetch.mockResolvedValue({
      data: [r(1, "Stromae", "Papaoutai", "https://cdn/live.mp3", "(Live)")],
    });
    expect(await deezerPreviewMatch("Stromae", "Papaoutai")).toBe(
      "https://cdn/live.mp3",
    );
  });

  it("aucun résultat exact : pas d'id", async () => {
    dz.fetch.mockResolvedValue({ data: [r(1, "Piano Queen", "Bohemian")] });
    expect(await deezerIdMatch("Queen", "Bohemian")).toBeNull();
  });

  it("résultat sans extrait : pas d'id", async () => {
    dz.fetch.mockResolvedValue({ data: [r(1, "Stromae", "Papaoutai", "")] });
    expect(await deezerIdMatch("Stromae", "Papaoutai")).toBeNull();
  });

  it("artiste ou titre manquant : pas de recherche", async () => {
    expect(await deezerIdMatch("", "T")).toBeNull();
    expect(await deezerIdMatch("A", null)).toBeNull();
    expect(dz.fetch).not.toHaveBeenCalled();
  });

  it("refus de Deezer (quota) : lève, le titre sera repris", async () => {
    dz.fetch.mockResolvedValue({ error: { code: 4 } });
    await expect(deezerIdMatch("Stromae", "Papaoutai")).rejects.toThrow();
  });

  it("panne réseau : lève", async () => {
    dz.fetch.mockRejectedValueOnce(new Error("réseau"));
    await expect(deezerIdMatch("Stromae", "Papaoutai")).rejects.toThrow(
      "réseau",
    );
  });

  it("extrait par nom : refus de Deezer = pas d'extrait, sans lever", async () => {
    dz.fetch.mockResolvedValue({ error: { code: 4 } });
    expect(await deezerPreviewMatch("Stromae", "Papaoutai")).toBeNull();
  });
});
