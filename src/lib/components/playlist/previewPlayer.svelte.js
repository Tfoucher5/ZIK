// Un seul son à la fois sur la page : extrait Deezer ou lecteur YouTube.
class PreviewPlayer {
  current = $state(null);
  #audio = null;

  toggle(key, url) {
    if (this.current === key) {
      this.stop();
      return;
    }
    this.stop();
    if (!url) return;
    this.#audio = new Audio(url);
    this.#audio.volume = 0.7;
    this.#audio.onended = () => {
      if (this.current === key) this.current = null;
    };
    this.#audio.play().catch(() => {
      if (this.current === key) this.current = null;
    });
    this.current = key;
  }

  // Le lecteur YouTube prend la main : on coupe l'extrait en cours.
  claim(key) {
    this.stop();
    this.current = key;
  }

  stop() {
    this.#audio?.pause();
    this.#audio = null;
    this.current = null;
  }
}

export const player = new PreviewPlayer();
