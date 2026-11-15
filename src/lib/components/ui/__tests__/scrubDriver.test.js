import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { scrub } from "../scrub.js";

const SOURCES = { portrait: "p.mp4", paysage: "l.mp4" };
let win;
let frames;
let visible;
let host;
let video;

// Écouteurs façon DOM : { once } retire l'écouteur au premier appel
function emitter() {
  const map = new Map();
  const once = new Set();
  const off = (ev, fn) => map.get(ev)?.delete(fn);
  return {
    map,
    on: (ev, fn, o) => {
      (map.get(ev) ?? map.set(ev, new Set()).get(ev)).add(fn);
      if (o?.once) once.add(fn);
    },
    off,
    emit: (ev) =>
      [...(map.get(ev) ?? [])].forEach((fn) => {
        if (once.has(fn)) off(ev, fn);
        fn();
      }),
    count: () => [...map.values()].reduce((n, s) => n + s.size, 0),
  };
}

function fakeVideo() {
  const e = emitter();
  return {
    e,
    src: "",
    currentTime: 0,
    duration: NaN,
    loop: false,
    addEventListener: e.on,
    removeEventListener: e.off,
    load: vi.fn(),
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
  };
}

function setup({ saveData = false, readyState = "complete" } = {}) {
  win = emitter();
  frames = [];
  vi.stubGlobal("addEventListener", win.on);
  vi.stubGlobal("removeEventListener", win.off);
  vi.stubGlobal("navigator", { connection: { saveData } });
  vi.stubGlobal("document", {
    readyState,
    hidden: false,
    addEventListener() {},
    removeEventListener() {},
  });
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.stubGlobal("innerHeight", 800);
  vi.stubGlobal("requestAnimationFrame", (fn) => frames.push(fn));
  vi.stubGlobal("cancelAnimationFrame", () => (frames = []));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb) {
        visible = () => cb([{ isIntersecting: true }]);
      }
      observe() {}
      disconnect() {}
    },
  );
  host = {
    top: 0,
    getBoundingClientRect: () => ({ top: host.top, height: 6000 }),
  };
  video = fakeVideo();
}

const frame = (now) => frames.shift()?.(now);

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("vidéo pilotée au scroll", () => {
  it("ne pose la source qu'au premier geste, puis retire les écouteurs de geste", () => {
    setup();
    scrub(host, video, { sources: SOURCES });
    visible();
    frame(0);
    expect(video.src).toBe("");
    win.emit("scroll");
    frame(16);
    expect(video.src).toBe("l.mp4");
    expect(video.load).toHaveBeenCalledOnce();
    expect(win.map.get("pointerdown").size).toBe(0);
  });

  it("se charge seule après le délai sans geste", () => {
    setup();
    scrub(host, video, { sources: SOURCES, delay: 2500 });
    visible();
    vi.advanceTimersByTime(2500);
    frame(0);
    expect(video.src).toBe("l.mp4");
  });

  it("ne charge jamais rien en économie de données", () => {
    setup({ saveData: true });
    const onprogress = vi.fn();
    scrub(host, video, { sources: SOURCES, onprogress });
    visible();
    win.emit("pointerdown");
    vi.advanceTimersByTime(10000);
    frame(0);
    frame(16);
    expect(video.src).toBe("");
    expect(video.load).not.toHaveBeenCalled();
    expect(onprogress).toHaveBeenCalled();
  });

  it("un seul seek à la fois, le suivant après « seeked »", () => {
    setup();
    scrub(host, video, { sources: SOURCES });
    visible();
    win.emit("scroll");
    frame(0);
    video.duration = 10;
    video.e.emit("loadeddata");
    host.top = -2600; // milieu de la scène
    frame(1000);
    frame(1100);
    const first = video.currentTime;
    expect(first).toBeGreaterThan(0);
    frame(1200);
    frame(1300);
    expect(video.currentTime).toBe(first);
    video.e.emit("seeked");
    frame(1400);
    expect(video.currentTime).toBeGreaterThan(first);
  });

  it("sans données en 4 s, la vidéo tourne en boucle et n'est plus pilotée", async () => {
    setup();
    scrub(host, video, { sources: SOURCES });
    visible();
    win.emit("scroll");
    frame(0);
    await Promise.resolve();
    vi.advanceTimersByTime(4000);
    expect(video.loop).toBe(true);
    expect(video.play).toHaveBeenCalledTimes(2);
    const pauses = video.pause.mock.calls.length;
    video.duration = 10;
    video.e.emit("loadeddata");
    host.top = -2600;
    frame(1000);
    frame(1100);
    expect(video.pause).toHaveBeenCalledTimes(pauses);
    expect(video.currentTime).toBe(0);
  });

  it("l'arrêt retire tous les écouteurs, minuteurs et images", () => {
    setup({ readyState: "loading" });
    const stop = scrub(host, video, { sources: SOURCES });
    win.emit("load");
    visible();
    win.emit("scroll");
    frame(0);
    stop();
    expect(win.count()).toBe(0);
    expect(video.e.count()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(frames).toHaveLength(0);
  });
});
