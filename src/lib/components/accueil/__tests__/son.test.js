import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSon } from "../son.js";

// AudioContext simulé : on compte les contextes, les oscillateurs et les réglages
function fauxAudio() {
  const journal = { contextes: [], oscs: 0, gains: [], filtres: [] };
  const param = (log) => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    setTargetAtTime(v) {
      log?.push(v);
    },
  });
  const noeud = (extra = {}) => ({
    connect: (n) => n,
    start() {},
    stop() {},
    ...extra,
  });
  class Ctx {
    constructor() {
      this.currentTime = 0;
      this.sampleRate = 8;
      this.destination = noeud();
      this.resume = vi.fn();
      this.suspend = vi.fn();
      this.close = vi.fn();
      journal.contextes.push(this);
    }
    createGain() {
      return noeud({ gain: param(journal.gains) });
    }
    createBiquadFilter() {
      return noeud({ frequency: param(journal.filtres), Q: param() });
    }
    createOscillator() {
      journal.oscs++;
      return noeud({ frequency: param() });
    }
    createBufferSource() {
      return noeud();
    }
    createDynamicsCompressor() {
      return noeud();
    }
    createBuffer() {
      return { getChannelData: () => new Float32Array(8) };
    }
  }
  return { Ctx, journal };
}

describe("son de l'accueil", () => {
  let audio;
  beforeEach(() => {
    vi.useFakeTimers();
    audio = fauxAudio();
    vi.stubGlobal("window", { AudioContext: audio.Ctx });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("aucun contexte audio avant le geste du joueur", () => {
    const son = createSon();
    son.ouvre(1, 1);
    son.ding();
    expect(audio.journal.contextes).toHaveLength(0);
    expect(son.on).toBe(false);
  });

  it("start lance la boucle, stop la coupe puis suspend le contexte", () => {
    const son = createSon();
    son.start();
    expect(son.on).toBe(true);
    const [ctx] = audio.journal.contextes;
    expect(ctx.resume).toHaveBeenCalled();
    vi.advanceTimersByTime(40);
    expect(audio.journal.oscs).toBeGreaterThan(0);
    son.stop();
    expect(son.on).toBe(false);
    vi.advanceTimersByTime(400);
    expect(ctx.suspend).toHaveBeenCalled();
    son.start();
    expect(audio.journal.contextes).toHaveLength(1);
  });

  it("ouvre ne règle rien sous le seuil, et règle au-delà", () => {
    const son = createSon();
    son.start();
    const avant = audio.journal.filtres.length;
    son.ouvre(0.002, 1);
    expect(audio.journal.filtres).toHaveLength(avant);
    son.ouvre(1, 1);
    expect(audio.journal.filtres).toHaveLength(avant + 1);
    expect(audio.journal.filtres.at(-1)).toBeCloseTo(170 * 95);
  });

  it("ding ignoré son coupé, joué son ouvert", () => {
    const son = createSon();
    son.start();
    son.stop();
    const n = audio.journal.oscs;
    son.ding();
    expect(audio.journal.oscs).toBe(n);
    son.start();
    son.ding();
    expect(audio.journal.oscs).toBe(n + 4);
  });

  it("close ferme le contexte en quittant la page", () => {
    const son = createSon();
    son.close();
    son.start();
    const [ctx] = audio.journal.contextes;
    son.close();
    expect(ctx.close).toHaveBeenCalled();
    expect(son.on).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(ctx.suspend).not.toHaveBeenCalled();
  });
});
