// Vidéos de l'écran TV. Deux lecteurs : l'un joue la manche, l'autre charge en
// muet la vidéo de la suivante. Au changement de manche on permute, sans
// attendre le réseau.

const FAKE_META = {
  title: "♪ ♪ ♪",
  artist: "???",
  album: "ZIK - Blind Test",
  artwork: [
    {
      src: "/favicon/web-app-manifest-192x192.png",
      sizes: "192x192",
      type: "image/png",
    },
  ],
};

export class HostYoutube {
  active = $state(0);
  #ready = false;
  #yt = [null, null];
  #preload = null; // { videoId, startSeconds, slot, go }
  #activePlaying = false;
  #preloadTimer = null;
  #currentStartSecs = 0;
  #metaGuard = null;
  #volume = 100;
  #onMusicReady;

  constructor(onMusicReady) {
    this.#onMusicReady = onMusicReady;
  }

  init() {
    if (window.YT?.Player) {
      this.#ready = true;
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      this.#ready = true;
    };
  }

  #applyVolume(p) {
    try {
      if (this.#volume === 0) p?.mute?.();
      else {
        p?.unMute?.();
        p?.setVolume?.(this.#volume);
      }
    } catch {
      /* YT pas prêt */
    }
  }

  setVolume(v) {
    this.#volume = v;
    this.#applyVolume(this.#yt[this.active]);
  }

  #whenYT(fn) {
    if (this.#ready) return fn();
    const check = setInterval(() => {
      if (!this.#ready) return;
      clearInterval(check);
      fn();
    }, 200);
  }

  #makePlayer(slot, videoId, startSeconds) {
    this.#yt[slot] = new window.YT.Player(`salon-yt-${slot}`, {
      height: "100%",
      width: "100%",
      videoId,
      // mute d'office pour le préchargement : pas un instant du titre suivant à voix haute
      playerVars: {
        autoplay: 1,
        mute: slot === this.active ? 0 : 1,
        controls: 1,
        enablejsapi: 1,
        start: startSeconds,
        rel: 0,
        modestbranding: 1,
      },
      events: {
        onReady: (e) => {
          if (slot === this.active) this.#applyVolume(e.target);
          else e.target.mute();
          e.target.playVideo();
        },
        onStateChange: (e) => this.#onState(slot, e.data),
      },
    });
  }

  #onState(slot, state) {
    if (slot !== this.active) {
      // Lecteur de préchargement : un instant de lecture muette lance la mise
      // en mémoire tampon, puis pause.
      if (state === 1) {
        try {
          this.#yt[slot].pauseVideo();
        } catch {
          /* YT pas prêt */
        }
      }
      return;
    }
    if (state === 1 /* PLAYING */) {
      this.#applyVolume(this.#yt[slot]);
      this.#startMediaGuard();
      this.#onMusicReady?.();
      if (!this.#activePlaying) {
        this.#activePlaying = true;
        // Le titre en cours remplit son tampon avant qu'on charge le suivant
        clearTimeout(this.#preloadTimer);
        this.#preloadTimer = setTimeout(() => this.#startPreload(), 3000);
      }
    }
    if (state === 0 /* ENDED */ || state === 2 /* PAUSED */)
      this.#stopMediaGuard();
  }

  #startPreload() {
    const pre = this.#preload;
    if (!pre || pre.go) return;
    pre.go = true;
    const { slot, videoId, startSeconds } = pre;
    this.#whenYT(() => {
      if (!this.#yt[slot]) return this.#makePlayer(slot, videoId, startSeconds);
      this.#yt[slot].mute();
      this.#yt[slot].loadVideoById({
        videoId,
        startSeconds,
        suggestedQuality: "medium",
      });
    });
  }

  preloadVideo(videoId, startSeconds) {
    this.#preload = { videoId, startSeconds, slot: 1 - this.active, go: false };
    // Au lobby rien ne joue : on charge tout de suite
    if (this.#activePlaying || !this.#yt[this.active]) this.#startPreload();
  }

  #startMediaGuard() {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata(FAKE_META);
    navigator.mediaSession.playbackState = "playing";
    clearInterval(this.#metaGuard);
    this.#metaGuard = setInterval(() => {
      if (!("mediaSession" in navigator)) return;
      navigator.mediaSession.metadata = new MediaMetadata(FAKE_META);
      navigator.mediaSession.playbackState = "playing";
    }, 500);
  }

  #stopMediaGuard() {
    clearInterval(this.#metaGuard);
    this.#metaGuard = null;
    if ("mediaSession" in navigator)
      navigator.mediaSession.playbackState = "none";
  }

  loadVideo(videoId, startSeconds) {
    this.#currentStartSecs = startSeconds;
    this.#activePlaying = false;
    clearTimeout(this.#preloadTimer);
    const pre = this.#preload;
    if (pre?.go && pre.videoId === videoId && this.#yt[pre.slot]) {
      const old = this.active;
      this.active = pre.slot;
      this.#preload = null;
      try {
        this.#yt[old]?.pauseVideo();
      } catch {
        /* YT pas prêt */
      }
      const p = this.#yt[this.active];
      try {
        this.#applyVolume(p);
        p.seekTo(startSeconds, true);
        p.playVideo();
      } catch {
        /* YT pas prêt */
      }
      return;
    }
    if (pre?.videoId === videoId) this.#preload = null;
    this.#whenYT(() => {
      const p = this.#yt[this.active];
      if (!p) return this.#makePlayer(this.active, videoId, startSeconds);
      p.loadVideoById({ videoId, startSeconds, suggestedQuality: "medium" });
      setTimeout(() => {
        try {
          p.playVideo();
        } catch {
          /* YT pas prêt */
        }
      }, 400);
    });
  }

  pauseVideo() {
    try {
      this.#yt[this.active]?.pauseVideo();
    } catch {
      /* YT pas prêt */
    }
  }

  resumeVideo() {
    try {
      this.#yt[this.active]?.playVideo();
    } catch {
      /* YT pas prêt */
    }
  }

  revealVideo() {
    const p = this.#yt[this.active];
    if (!p) return;
    try {
      p.seekTo(this.#currentStartSecs, true);
      p.playVideo();
    } catch {
      /* YT pas prêt */
    }
  }

  destroy() {
    this.#yt.forEach((p) => p?.destroy?.());
    clearTimeout(this.#preloadTimer);
    this.#stopMediaGuard();
  }
}
