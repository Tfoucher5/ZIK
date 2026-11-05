import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../mediaSession.js", () => ({
  lockMediaSession: () => {},
  unlockMediaSession: () => {},
}));

const { GameAudio } = await import("../gameAudio.js");

let audio, ecoutes;
const geste = (type) => {
  const fn = ecoutes[type];
  delete ecoutes[type];
  fn?.();
};
const attente = () => new Promise((r) => setTimeout(r));

describe("GameAudio", () => {
  beforeEach(() => {
    ecoutes = {};
    audio = {
      readyState: 4,
      duration: 30,
      currentTime: 0,
      play: vi.fn(async () => {}),
      pause: vi.fn(),
      load: vi.fn(),
    };
    vi.stubGlobal("document", {
      getElementById: () => audio,
      addEventListener: (type, fn) => {
        ecoutes[type] = fn;
      },
      removeEventListener: (type) => {
        delete ecoutes[type];
      },
    });
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.stubGlobal("localStorage", { getItem: () => "50", setItem: () => {} });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function partie() {
    const a = new GameAudio({ onPlayerReady: vi.fn() });
    a.lastVideo = { startSeconds: 0 };
    a.roundActive = true;
    return a;
  }

  it("lecture bloquée : le son repart au geste qui l'autorise au toucher", async () => {
    audio.play.mockRejectedValueOnce(new Error("NotAllowedError"));
    partie().startSynced(0);
    await attente();
    expect(ecoutes.pointerdown).toBeUndefined();
    expect(ecoutes.pointerup).toBeTypeOf("function");

    geste("pointerup");
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(ecoutes.keydown).toBeUndefined();
  });

  it("démarrage synchronisé : la lecture se cale sur le temps déjà écoulé", () => {
    partie().startSynced(5);
    expect(audio.play).toHaveBeenCalledOnce();
    expect(audio.currentTime).toBeCloseTo(5, 0);
  });

  it("start sans lecture (joueur aux scores) : rien ne joue", () => {
    const a = partie();
    a.startSynced(3, { play: false });
    expect(audio.play).not.toHaveBeenCalled();
    expect(a.syncAnchor).not.toBeNull();
  });

  it("une manche se joue avec son fichier audio", () => {
    const a = partie();
    a.playRound({ audioUrl: "/api/game/audio?v=x", startSeconds: 0 });
    expect(audio.src).toBe("/api/game/audio?v=x");
    expect(audio.load).toHaveBeenCalledOnce();
    clearInterval(a.metaGuard);
  });

  it("pause et reprise admin : agissent sur l'audio", () => {
    const a = partie();
    a.pause();
    expect(audio.pause).toHaveBeenCalledOnce();
    expect(a.adminPaused).toBe(true);
    a.resume();
    expect(audio.play).toHaveBeenCalledOnce();
    expect(a.adminPaused).toBe(false);
  });
});
