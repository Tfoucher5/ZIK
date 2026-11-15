import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { visibleLoop } from "../loop.js";

let observe;
let frames;

beforeEach(() => {
  frames = new Map();
  let n = 0;
  vi.stubGlobal("requestAnimationFrame", (fn) => (frames.set(++n, fn), n));
  vi.stubGlobal("cancelAnimationFrame", (id) => frames.delete(id));
  vi.stubGlobal("document", {
    hidden: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb) {
        observe = (v) => cb([{ isIntersecting: v }]);
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

const runFrame = (now) => {
  const [[id, fn]] = frames;
  frames.delete(id);
  fn(now);
};

describe("boucle visible", () => {
  it("ne tourne qu'à l'écran", () => {
    const frame = vi.fn();
    visibleLoop({}, frame);
    expect(frames.size).toBe(0);
    observe(true);
    expect(frames.size).toBe(1);
    observe(false);
    expect(frames.size).toBe(0);
  });

  it("donne dt en secondes, plafonné", () => {
    const frame = vi.fn();
    visibleLoop({}, frame);
    observe(true);
    runFrame(1000);
    runFrame(1016);
    runFrame(5000);
    expect(frame.mock.calls.map((c) => c[0])).toEqual([0, 0.016, 0.1]);
  });

  it("s'arrête quand l'onglet est caché et à la destruction", () => {
    const stop = visibleLoop({}, vi.fn());
    observe(true);
    document.hidden = true;
    document.addEventListener.mock.calls[0][1]();
    expect(frames.size).toBe(0);
    document.hidden = false;
    document.addEventListener.mock.calls[0][1]();
    expect(frames.size).toBe(1);
    stop();
    expect(frames.size).toBe(0);
  });
});
