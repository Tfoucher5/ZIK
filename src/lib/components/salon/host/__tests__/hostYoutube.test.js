import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HostYoutube } from "../hostYoutube.svelte.js";

// Faux lecteur YouTube : on garde les options et on compte les appels
function fauxYT() {
  const lecteurs = [];
  globalThis.window = {
    YT: {
      Player: class {
        constructor(id, opts) {
          this.opts = opts;
          this.playVideo = vi.fn();
          this.pauseVideo = vi.fn();
          this.loadVideoById = vi.fn();
          this.seekTo = vi.fn();
          this.mute = vi.fn();
          this.unMute = vi.fn();
          this.setVolume = vi.fn();
          lecteurs.push(this);
        }
        pret() {
          this.opts.events.onReady({ target: this });
        }
      },
    },
  };
  return lecteurs;
}

describe("lecteur de la TV : la pause tient", () => {
  let lecteurs;
  beforeEach(() => {
    vi.useFakeTimers();
    lecteurs = fauxYT();
  });
  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.window;
  });

  it("TV rechargée pendant une pause : le lecteur créé ne joue pas tout seul", () => {
    const yt = new HostYoutube();
    yt.init();
    yt.loadVideo("vid123", 52);
    yt.pauseVideo();
    expect(lecteurs).toHaveLength(1);
    expect(lecteurs[0].opts.playerVars.autoplay).toBe(1);
    lecteurs[0].pret();
    expect(lecteurs[0].playVideo).not.toHaveBeenCalled();
    yt.resumeVideo();
    expect(lecteurs[0].playVideo).toHaveBeenCalledOnce();
  });

  it("lecteur déjà là : la relance prévue 400 ms après le chargement ne passe pas outre la pause", () => {
    const yt = new HostYoutube();
    yt.init();
    yt.loadVideo("vid1", 0);
    lecteurs[0].pret();
    lecteurs[0].playVideo.mockClear();
    yt.loadVideo("vid2", 30);
    yt.pauseVideo();
    vi.advanceTimersByTime(500);
    expect(lecteurs[0].playVideo).not.toHaveBeenCalled();
    expect(lecteurs[0].pauseVideo).toHaveBeenCalled();
  });

  it("sans pause, un nouveau titre joue normalement", () => {
    const yt = new HostYoutube();
    yt.init();
    yt.pauseVideo();
    yt.loadVideo("vid1", 0);
    lecteurs[0].pret();
    expect(lecteurs[0].playVideo).toHaveBeenCalledOnce();
  });
});
