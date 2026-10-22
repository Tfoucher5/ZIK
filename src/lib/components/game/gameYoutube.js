// Lecteur YouTube caché, en secours quand la manche n'a pas de fichier audio.
// Il lit l'état de synchro de la partie (GameAudio) pour se caler dessus.

export class GameYoutube {
  player = null;
  ready = false;
  #pending = null;
  #game;

  constructor(game) {
    this.#game = game;
  }

  load(videoId, startSeconds) {
    if (!this.ready || !this.player) {
      this.#pending = { id: videoId, start: startSeconds };
      this.#create();
      return;
    }
    this.player.mute();
    this.player.loadVideoById({ videoId, startSeconds });
  }

  #create() {
    window.onYouTubeIframeAPIReady = () => {
      this.player = new window.YT.Player("yt-player", {
        height: "1",
        width: "1",
        playerVars: {
          autoplay: 1,
          controls: 0,
          enablejsapi: 1,
          playsinline: 1,
        },
        events: {
          onReady: (e) => this.#onReady(e),
          onStateChange: (e) => this.#onState(e),
        },
      });
    };
    if (!document.getElementById("yt-api-script")) {
      const s = document.createElement("script");
      s.id = "yt-api-script";
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    } else if (window.YT?.Player) {
      window.onYouTubeIframeAPIReady();
    }
  }

  #onReady(e) {
    this.ready = true;
    e.target.setVolume(this.#game.volume);
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      document.addEventListener(
        "touchstart",
        () => {
          this.player.mute();
          this.player.playVideo();
          setTimeout(() => {
            if (!this.#game.roundActive) this.player.pauseVideo();
          }, 200);
        },
        { capture: true, once: true },
      );
    }
    if (this.#pending) {
      this.load(this.#pending.id, this.#pending.start);
      this.#pending = null;
    }
  }

  #onState(e) {
    const { PlayerState } = window.YT;
    const g = this.#game;
    const yt = this.player;
    if (e.data === PlayerState.PLAYING) {
      yt.setVolume(g.volume);
      yt.unMute();
      g.startMediaGuard();
      if (g.waitingForSync) {
        g.onPlayerReady();
        g.syncPaused = true;
        yt.pauseVideo();
      } else if (g.syncAnchor !== null && g.lastVideo && yt?.getCurrentTime) {
        // Arrivée en cours de manche : on recale direct sur la référence
        const expected =
          g.lastVideo.startSeconds + (Date.now() - g.syncAnchor) / 1000;
        if (Math.abs(yt.getCurrentTime() - expected) > 2)
          yt.seekTo(expected, true);
      }
    }
    const stopped =
      e.data === PlayerState.ENDED || e.data === PlayerState.PAUSED;
    if (
      !g.syncPaused &&
      !g.adminPaused &&
      g.roundActive &&
      g.lastVideo &&
      stopped
    ) {
      const elapsed =
        g.syncAnchor !== null
          ? (Date.now() - g.syncAnchor) / 1000
          : (Date.now() - g.lastVideo.startedAt) / 1000;
      this.load(g.lastVideo.videoId, g.lastVideo.startSeconds + elapsed);
    }
  }
}
