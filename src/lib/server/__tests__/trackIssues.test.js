import { describe, it, expect } from "vitest";
import { filterVideos, pickStart } from "../services/trackIssues.js";

const v = (title) => ({ title });

describe("filterVideos", () => {
  it("écarte les titres qui contiennent un mot exclu", () => {
    const out = filterVideos(
      [v("Indochine - L'aventurier (Live à Bercy)"), v("L'aventurier")],
      ["live"],
    );
    expect(out.map((x) => x.title)).toEqual(["L'aventurier"]);
  });
  it("gère les accents et ne coupe pas dans un mot", () => {
    const out = filterVideos(
      [v("Djadja (Karaoké)"), v("Olivia - Delivery")],
      ["karaoké", "live"],
    );
    expect(out.map((x) => x.title)).toEqual(["Olivia - Delivery"]);
  });
  it("garde tout si tout serait écarté", () => {
    const list = [v("Song (Live)")];
    expect(filterVideos(list, ["live"])).toBe(list);
  });
});

describe("pickStart", () => {
  it("respecte le départ épinglé", () => {
    expect(
      pickStart({
        pinned: 42,
        durationSec: 200,
        roundDuration: 30,
        minStart: 15,
      }),
    ).toBe(42);
  });
  it("ne démarre pas avant le minimum", () => {
    for (let i = 0; i < 50; i++) {
      const s = pickStart({
        pinned: null,
        durationSec: 200,
        roundDuration: 30,
        minStart: 15,
      });
      expect(s).toBeGreaterThanOrEqual(15);
      expect(s).toBeLessThanOrEqual(160);
    }
  });
  it("reste dans la vidéo quand elle est courte", () => {
    expect(
      pickStart({
        pinned: null,
        durationSec: 40,
        roundDuration: 30,
        minStart: 15,
      }),
    ).toBe(0);
  });
});
