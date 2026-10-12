const VOLUME_KEY = "zikle_volume";

// Lecture de l'extrait bornée à la durée débloquée, volume mémorisé d'une partie à l'autre.
export class SnippetPlayer {
  el = $state();
  playing = $state(false);
  progress = $state(0); // 0..1 sur la fenêtre débloquée
  volume = $state(0.8);
  muted = $state(false);
  #rafId;
  #stopTimer;

  constructor(onError) {
    this.onError = onError;
  }

  loadVolume() {
    const saved = parseFloat(localStorage.getItem(VOLUME_KEY) ?? "");
    if (Number.isFinite(saved) && saved >= 0 && saved <= 1) this.volume = saved;
  }

  setVolume(value) {
    this.volume = value;
    if (value > 0) this.muted = false;
    localStorage.setItem(VOLUME_KEY, String(value));
  }

  toggleMute() {
    this.muted = !this.muted;
  }

  clear() {
    cancelAnimationFrame(this.#rafId);
    clearTimeout(this.#stopTimer);
    this.#rafId = null;
    this.#stopTimer = null;
    if (this.el) this.el.pause();
    this.playing = false;
    this.progress = 0;
  }

  #tick(dur) {
    if (!this.el) return;
    this.progress = Math.min(1, this.el.currentTime / dur);
    if (this.el.currentTime >= dur) {
      this.clear();
      return;
    }
    this.#rafId = requestAnimationFrame(() => this.#tick(dur));
  }

  play(dur) {
    if (!this.el || this.playing) return;
    this.clear();
    this.onError("");
    this.el.currentTime = 0;
    this.playing = true;
    this.el.play().catch(() => {
      this.playing = false;
      this.onError("Lecture impossible, réessaie.");
    });
    this.#rafId = requestAnimationFrame(() => this.#tick(dur));
    // Filet de sécurité si requestAnimationFrame est throttlé (onglet en arrière-plan).
    this.#stopTimer = setTimeout(() => this.clear(), dur * 1000 + 250);
  }

  // Les contrôles média du navigateur (barre média, touches multimédia) appellent
  // play() directement sur l'élément, hors de play() : la durée débloquée
  // n'est alors bornée par rien et tout l'extrait devient audible.
  onAudioPlay = () => {
    if (this.playing) return;
    this.el.pause();
  };

  onAudioError = () => {
    this.clear();
    this.onError("Cet extrait n'a pas pu être chargé, réessaie plus tard.");
  };
}
