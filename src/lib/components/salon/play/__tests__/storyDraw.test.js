import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render } from "svelte/server";
import { shareFile, downloadBlob } from "../../../../client/shareFile.js";
import {
  storyData,
  drawStory,
  prepareStory,
  shareStory,
} from "../podiumStory.js";
import StoryShare from "../StoryShare.svelte";

vi.mock("../../../../client/shareFile.js", () => ({
  shareFile: vi.fn(),
  downloadBlob: vi.fn(),
}));

// Contexte 2D minimal : ni letterSpacing, ni roundRect, ni fontBoundingBox*
function fakeCtx() {
  const texts = [];
  const ctx = {
    font: "",
    texts,
    measureText(t) {
      return {
        width:
          t.length * parseFloat(/(\d+(\.\d+)?)px/.exec(this.font)[1]) * 0.5,
      };
    },
    fillText(text, x, y, max) {
      texts.push({
        text,
        x,
        max,
        font: this.font,
        width: this.measureText(text).width,
      });
    },
    createRadialGradient: () => ({ addColorStop() {} }),
  };
  for (const m of [
    "fillRect",
    "save",
    "restore",
    "translate",
    "scale",
    "beginPath",
    "arc",
    "fill",
    "rect",
  ])
    ctx[m] = () => {};
  return ctx;
}
const fakeCanvas = (ctx, blob = new Blob(["png"])) => ({
  getContext: () => ctx,
  toBlob: (ok) => ok(blob),
});

const finalRanking = {
  top: [
    { rank: 1, username: "Léa", score: 1520 },
    { rank: 2, username: "Bob", score: 900 },
    { rank: 3, username: "Chloé", score: 400 },
  ],
  me: { rank: 1, score: 1520, found: 8 },
  count: 8,
};

beforeEach(() => vi.stubGlobal("document", {}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("dessin de la story", () => {
  it("sans letterSpacing, roundRect, mesures de police ni document.fonts : ne lève pas", async () => {
    const ctx = fakeCtx();
    const d = storyData({
      finalRanking,
      teams: [{ id: 0, name: "Rouge", score: 10 }],
      myTeam: 0,
      username: "Léa",
    });
    await expect(drawStory(fakeCanvas(ctx), d)).resolves.toBeTruthy();
    expect(ctx.texts.map((t) => t.text)).toContain("ROUGE");
  });

  it("un pseudo de 20 caractères tient entre x 70 et 930, maxWidth passé", async () => {
    const name = "ABCDEFGHIJKLMNOPQRST";
    for (const rank of [1, 5, 8]) {
      const ctx = fakeCtx();
      const d = storyData({
        finalRanking: { ...finalRanking, me: { rank, score: 1 } },
        username: name,
        round: 10,
      });
      await drawStory(fakeCanvas(ctx), d);
      const t = ctx.texts.find((x) => x.text === name);
      expect(t.max).toBeGreaterThan(0);
      expect(t.x).toBeGreaterThanOrEqual(70);
      expect(t.x + t.max).toBeLessThanOrEqual(930);
      // Réduit par fitFont jusqu'à 48 px, puis comprimé par maxWidth si besoin
      if (t.width > t.max) expect(t.font).toMatch(/ 48px /);
      expect(t.font).not.toMatch(/ 180px /);
    }
  });

  it("aucun autre pseudo que le mien n'est dessiné", async () => {
    const ctx = fakeCtx();
    await drawStory(
      fakeCanvas(ctx),
      storyData({ finalRanking, username: "Léa", round: 10 }),
    );
    const all = ctx.texts.map((t) => t.text).join(" ");
    expect(all).toContain("LÉA");
    expect(all).not.toMatch(/bob|chlo/i);
  });

  it("prepareStory rend un PNG, ou lève si l'image ne sort pas", async () => {
    const d = storyData({ finalRanking, username: "Léa" });
    vi.stubGlobal("document", {
      createElement: () => fakeCanvas(fakeCtx()),
    });
    const f = await prepareStory(d);
    expect(f.name).toBe("zik-podium.png");
    expect(f.type).toBe("image/png");
    vi.stubGlobal("document", {
      createElement: () => fakeCanvas(fakeCtx(), null),
    });
    await expect(prepareStory(d)).rejects.toThrow("image");
  });
});

describe("partage de la story", () => {
  const file = { name: "zik-podium.png" };

  it("partagée ou menu fermé : aucun téléchargement", async () => {
    for (const r of ["shared", "cancelled"]) {
      shareFile.mockResolvedValueOnce(r);
      expect(await shareStory(file)).toBe(r);
    }
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it("partage indisponible : l'image est téléchargée", async () => {
    shareFile.mockResolvedValueOnce(null);
    expect(await shareStory(file)).toBe("downloaded");
    expect(downloadBlob).toHaveBeenCalledWith(file, "zik-podium.png");
  });
});

describe("bouton de partage", () => {
  const html = (me) =>
    render(StoryShare, {
      props: {
        data: storyData({
          finalRanking: { ...finalRanking, me },
          username: "Inès",
        }),
      },
    }).body;

  it("pendant la préparation : désactivé, état annoncé, ma ligne", () => {
    const h = html({ rank: 5, score: 1 });
    expect(h).toMatch(/<button[^>]*disabled/);
    expect(h).toMatch(/aria-live="polite"[^>]*>Préparation de l'image…/);
    expect(h).toContain("Inès, à la 5e place sur 8");
  });

  it("vignette : médaille sur le podium, neutre au-delà (pas de magenta)", () => {
    expect(html({ rank: 1, score: 1 })).toContain("--mc:#f4c542");
    const hors = html({ rank: 5, score: 1 });
    expect(hors).toContain("--mc:var(--text)");
    expect(hors).not.toContain("#ff00ff");
  });
});
