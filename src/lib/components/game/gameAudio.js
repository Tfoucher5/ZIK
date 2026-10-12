// Lecture de l'extrait d'une manche : fichier audio (cas normal) ou lecteur
// YouTube caché en secours. Tous les joueurs démarrent ensemble au signal
// round_start_sync, puis un garde-fou recale la lecture si elle dérive.

const FAKE_META = {
  title: "♪ ♪ ♪",
  artist: "???",
  album: "ZIK — Blind Test",
  artwork: [
    {
      src: "/favicon/web-app-manifest-192x192.png",
      sizes: "192x192",
      type: "image/png",
    },
  ],
};

const audioEl = () => document.getElementById("previewAudio");

export function savedVolume() {
  return parseInt(localStorage.getItem("zik_vol") ?? "50");
}

// Le titre ne doit jamais apparaître dans les contrôles système du téléphone
function lockMediaSession() {
  if (!("mediaSession" in navigator)) return;
  try {
    const fake = new MediaMetadata(FAKE_META);
    Object.defineProperty(navigator.mediaSession, "metadata", {
      get: () => fake,
      set: () => {},
      configurable: true,
    });
  } catch {
    /* navigateur sans MediaMetadata */
  }
  navigator.mediaSession.playbackState = "playing";
}

export class GameAudio {
  ytPlayer = null;
  ytReady = false;
  pendingLoad = null;
  roundActive = false;
  waitingForSync = false;
  syncPaused = false;
  adminPaused = false;
  usingIframe = false;
  // Instant (ms) où la lecture était à startSeconds : référence commune
  syncAnchor = null;
  lastVideo = null;
  // Extrait de la manche suivante, téléchargé pendant la manche en cours
  nextAudio = null;
  playingBlob = null;
  metaGuard = null;
  driftInterval = null;

  constructor({ onPlayerReady }) {
    this.onPlayerReady = onPlayerReady;
    lockMediaSession();
  }

  setVolume(v) {
    this.ytPlayer?.setVolume?.(v);
    const audio = audioEl();
    if (audio) audio.volume = v / 100;
    localStorage.setItem("zik_vol", v);
  }

  startMediaGuard() {
    lockMediaSession();
    clearInterval(this.metaGuard);
    this.metaGuard = setInterval(lockMediaSession, 200);
  }

  stopMediaGuard() {
    clearInterval(this.metaGuard);
    this.metaGuard = null;
    try {
      Object.defineProperty(navigator.mediaSession, "metadata", {
        get: () => null,
        set: () => {},
        configurable: true,
      });
    } catch {
      /* navigateur sans mediaSession */
    }
    if ("mediaSession" in navigator)
      navigator.mediaSession.playbackState = "none";
  }

  #createYTPlayer() {
    window.onYouTubeIframeAPIReady = () => {
      this.ytPlayer = new window.YT.Player("yt-player", {
        height: "1",
        width: "1",
        playerVars: {
          autoplay: 1,
          controls: 0,
          enablejsapi: 1,
          playsinline: 1,
        },
        events: {
          onReady: (e) => this.#onYTReady(e),
          onStateChange: (e) => this.#onYTState(e),
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

  #onYTReady(e) {
    this.ytReady = true;
    e.target.setVolume(savedVolume());
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      document.addEventListener(
        "touchstart",
        () => {
          this.ytPlayer.mute();
          this.ytPlayer.playVideo();
          setTimeout(() => {
            if (!this.roundActive) this.ytPlayer.pauseVideo();
          }, 200);
        },
        { capture: true, once: true },
      );
    }
    if (this.pendingLoad) {
      this.loadVideo(this.pendingLoad.id, this.pendingLoad.start);
      this.pendingLoad = null;
    }
  }

  #onYTState(e) {
    const { PlayerState } = window.YT;
    const yt = this.ytPlayer;
    if (e.data === PlayerState.PLAYING) {
      yt.setVolume(savedVolume());
      yt.unMute();
      this.startMediaGuard();
      if (this.waitingForSync) {
        this.onPlayerReady();
        this.syncPaused = true;
        yt.pauseVideo();
      } else if (
        this.syncAnchor !== null &&
        this.lastVideo &&
        yt?.getCurrentTime
      ) {
        // Arrivée en cours de manche : on recale direct sur la référence
        const expected =
          this.lastVideo.startSeconds + (Date.now() - this.syncAnchor) / 1000;
        if (Math.abs(yt.getCurrentTime() - expected) > 2)
          yt.seekTo(expected, true);
      }
    }
    const stopped =
      e.data === PlayerState.ENDED || e.data === PlayerState.PAUSED;
    if (
      !this.syncPaused &&
      !this.adminPaused &&
      this.roundActive &&
      this.lastVideo &&
      stopped
    ) {
      const elapsed =
        this.syncAnchor !== null
          ? (Date.now() - this.syncAnchor) / 1000
          : (Date.now() - this.lastVideo.startedAt) / 1000;
      this.loadVideo(
        this.lastVideo.videoId,
        this.lastVideo.startSeconds + elapsed,
      );
    }
  }

  loadVideo(videoId, startSeconds) {
    if (!this.ytReady || !this.ytPlayer) {
      this.pendingLoad = { id: videoId, start: startSeconds };
      this.#createYTPlayer();
      return;
    }
    this.ytPlayer.mute();
    this.ytPlayer.loadVideoById({ videoId, startSeconds });
  }

  prefetch(url) {
    this.dropPrefetch();
    const entry = {
      url,
      blobUrl: null,
      ctrl: new AbortController(),
      start: null,
    };
    entry.start = () => {
      entry.start = null;
      fetch(url, { signal: entry.ctrl.signal })
        .then((r) => (r.ok ? r.blob() : Promise.reject()))
        .then((b) => {
          if (this.nextAudio === entry) entry.blobUrl = URL.createObjectURL(b);
        })
        .catch(() => {});
    };
    this.nextAudio = entry;
    // Pas pendant le chargement de l'extrait courant : on ne lui vole pas la bande passante
    if (!this.waitingForSync) entry.start();
  }

  dropPrefetch() {
    if (!this.nextAudio) return;
    this.nextAudio.ctrl.abort();
    if (this.nextAudio.blobUrl) URL.revokeObjectURL(this.nextAudio.blobUrl);
    this.nextAudio = null;
  }

  // URL à lire : la copie locale si le préchargement a abouti
  #source(url) {
    if (this.playingBlob) {
      URL.revokeObjectURL(this.playingBlob);
      this.playingBlob = null;
    }
    if (this.nextAudio?.url === url && this.nextAudio.blobUrl) {
      this.playingBlob = this.nextAudio.blobUrl;
      this.nextAudio = null;
      return this.playingBlob;
    }
    this.dropPrefetch();
    return url;
  }

  loadAudio(audioUrl, startSeconds, onReady) {
    const audio = audioEl();
    if (!audio) return;
    this.ytPlayer?.stopVideo?.();
    audio.pause();
    audio.onloadedmetadata = null;
    audio.onended = null;
    audio.oncanplaythrough = null;
    this.startMediaGuard();
    audio.src = this.#source(audioUrl);
    audio.volume = savedVolume() / 100;
    if (onReady) {
      let readySent = false;
      const markReady = () => {
        if (readySent) return;
        readySent = true;
        clearTimeout(readyFallback);
        onReady();
      };
      const readyFallback = setTimeout(markReady, 4000);
      audio.oncanplaythrough = markReady;
    }
    audio.onloadedmetadata = () => {
      audio.currentTime = startSeconds;
      // La lecture démarre au signal round_start_sync (tous les joueurs en même
      // temps). Signal déjà passé (reconnexion) : on démarre au bon endroit.
      if (this.syncAnchor !== null) this.playSynced();
    };
    audio.onended = () => {
      if (this.roundActive) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    };
    audio.load();
  }

  // Joue la manche reçue : fichier audio, ou YouTube en secours
  playRound(data) {
    if (data.audioUrl) {
      this.usingIframe = false;
      this.loadAudio(data.audioUrl, data.startSeconds, () =>
        this.onPlayerReady(),
      );
    } else {
      this.usingIframe = true;
      this.loadVideo(data.videoId, data.startSeconds);
    }
  }

  // Position attendue dans l'extrait selon l'horloge de synchro (gère la boucle)
  #syncedPos(duration = null) {
    if (!this.lastVideo) return 0;
    const elapsed =
      this.syncAnchor !== null ? (Date.now() - this.syncAnchor) / 1000 : 0;
    let pos = this.lastVideo.startSeconds + elapsed;
    if (duration && pos >= duration) pos = (pos - duration) % duration;
    return pos;
  }

  playSynced() {
    const audio = audioEl();
    if (!audio || !this.lastVideo) return;
    if (audio.readyState >= 1)
      audio.currentTime = this.#syncedPos(audio.duration || null);
    audio.play().catch(() => {
      // Lecture bloquée par le navigateur : reprise au premier geste
      const resume = () => {
        audio.currentTime = this.#syncedPos(audio.duration || null);
        audio.play().catch(() => {});
        document.removeEventListener("pointerdown", resume, true);
        document.removeEventListener("keydown", resume, true);
      };
      document.addEventListener("pointerdown", resume, true);
      document.addEventListener("keydown", resume, true);
    });
  }

  // Signal commun de départ : elapsed secondes se sont déjà écoulées
  startSynced(elapsed, { play = true } = {}) {
    this.syncAnchor = Date.now() - elapsed * 1000;
    this.waitingForSync = false;
    this.syncPaused = false;
    this.nextAudio?.start?.();
    if (!play) return;
    if (this.usingIframe) {
      const yt = this.ytPlayer;
      if (yt?.seekTo && this.lastVideo)
        yt.seekTo(this.lastVideo.startSeconds + elapsed, true);
      yt?.unMute?.();
      yt?.setVolume?.(savedVolume());
      yt?.playVideo?.();
    } else {
      this.playSynced();
    }
  }

  // Recale la lecture si elle s'écarte de plus de 2 s de la référence
  startDriftGuard() {
    clearInterval(this.driftInterval);
    this.driftInterval = setInterval(() => {
      if (
        !this.roundActive ||
        this.syncAnchor === null ||
        this.syncPaused ||
        this.adminPaused ||
        !this.lastVideo
      )
        return;
      if (this.usingIframe) {
        const yt = this.ytPlayer;
        if (yt?.getPlayerState?.() === 1 && yt?.getCurrentTime) {
          const expected =
            this.lastVideo.startSeconds + (Date.now() - this.syncAnchor) / 1000;
          if (Math.abs(yt.getCurrentTime() - expected) > 2)
            yt.seekTo(expected, true);
        }
      } else {
        const audio = audioEl();
        if (audio && !audio.paused && audio.duration) {
          const expected = this.#syncedPos(audio.duration);
          if (Math.abs(audio.currentTime - expected) > 2)
            audio.currentTime = expected;
        }
      }
    }, 5000);
  }

  stop() {
    if (this.ytReady && this.ytPlayer) this.ytPlayer.stopVideo();
    const audio = audioEl();
    if (audio) {
      audio.onended = null;
      audio.oncanplaythrough = null;
      audio.pause();
      audio.src = "";
    }
  }

  // Fin de manche ou de partie : plus rien ne joue
  endRound() {
    this.roundActive = false;
    this.waitingForSync = false;
    this.syncAnchor = null;
    this.stop();
    this.stopMediaGuard();
  }

  pause() {
    this.adminPaused = true;
    try {
      this.ytPlayer?.pauseVideo();
    } catch {
      /* lecteur pas prêt */
    }
    audioEl()?.pause();
  }

  resume() {
    this.adminPaused = false;
    try {
      this.ytPlayer?.playVideo();
    } catch {
      /* lecteur pas prêt */
    }
    audioEl()
      ?.play()
      .catch(() => {});
  }

  destroy() {
    this.dropPrefetch();
    if (this.playingBlob) URL.revokeObjectURL(this.playingBlob);
    this.stopMediaGuard();
    clearInterval(this.driftInterval);
  }
}
