import { describe, it, expect } from "vitest";
import { buildResultCardSvg, OG_WIDTH, OG_HEIGHT } from "../og/resultCard.js";

const card = (over = {}) =>
  buildResultCardSvg({
    username: "Théo",
    score: 4200,
    rank: 1,
    totalPlayers: 6,
    roomName: "Rock des années 90",
    ...over,
  });

describe("buildResultCardSvg", () => {
  it("produit un SVG aux dimensions attendues par les réseaux", () => {
    const svg = card();
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(`width="${OG_WIDTH}"`);
    expect(svg).toContain(`height="${OG_HEIGHT}"`);
  });

  it("affiche le pseudo, le score et le rang", () => {
    const svg = card();
    expect(svg).toContain("Théo");
    expect(svg).toContain("4200");
    expect(svg).toContain("1er sur 6 joueurs");
  });

  it("accorde le libellé du rang", () => {
    expect(card({ rank: 2, totalPlayers: 1 })).toContain("2e sur 1 joueur");
  });

  it("ne met une médaille que sur le podium", () => {
    expect(card({ rank: 3 })).toContain("#b06a3b");
    expect(card({ rank: 4 })).not.toContain("#b06a3b");
  });

  it("retire les emoji que les polices embarquées ne couvrent pas", () => {
    const svg = card({ roomName: "🎸 Rock 90", username: "Théo 🎧" });
    expect(svg).not.toMatch(/[\u{1F000}-\u{1FAFF}]/u);
    expect(svg).toContain("Rock 90");
  });

  it("tronque un pseudo ou un thème trop long", () => {
    const svg = card({
      username: "A".repeat(60),
      roomName: "B".repeat(80),
    });
    expect(svg).toContain("…");
    expect(svg).not.toContain("A".repeat(30));
  });

  it("échappe les caractères qui casseraient le XML", () => {
    const svg = card({ username: 'Th<eo & "co"' });
    expect(svg).toContain("Th&lt;eo &amp;");
    expect(svg).not.toContain("Th<eo");
  });
});

describe("rendu PNG", () => {
  it("rasterise la carte avec les polices embarquées", async () => {
    const { svgToPng } = await import("../og/render.js");
    const png = svgToPng(card());
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.length).toBeGreaterThan(10_000);
  });
});
