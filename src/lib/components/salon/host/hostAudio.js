// Extrait audio (Deezer) joué par la TV quand la vidéo YouTube manque :
// mêmes commandes que le lecteur vidéo, pour que la manche ait lieu quand même
export class HostAudio {
  #a = null;
  #volume = 100;
  #fade = null;
  #onReady;
  #onError;

  constructor(onReady, onError) {
    this.#onReady = onReady;
    this.#onError = onError;
  }

  load(url) {
    this.stop();
    const a = new Audio(url);
    a.loop = true;
    a.volume = this.#volume / 100;
    a.addEventListener("playing", () => this.#onReady?.(), { once: true });
    a.addEventListener("error", () => this.#onError?.(url), { once: true });
    a.play().catch(() => {});
    this.#a = a;
  }

  setVolume(v) {
    this.#volume = v;
    if (this.#a && !this.#fade) this.#a.volume = v / 100;
  }

  pause() {
    this.#a?.pause();
  }

  resume() {
    this.#a?.play().catch(() => {});
  }

  // À la réponse : on réécoute depuis le début de l'extrait
  restart() {
    if (!this.#a) return;
    this.#a.currentTime = 0;
    this.resume();
  }

  fadeOut(ms = 6000) {
    const a = this.#a;
    if (!a) return;
    clearInterval(this.#fade);
    const from = a.volume;
    let step = 0;
    this.#fade = setInterval(() => {
      step++;
      a.volume = Math.max(0, from * (1 - step / 60) ** 2);
      if (step < 60) return;
      clearInterval(this.#fade);
      this.#fade = null;
      a.pause();
    }, ms / 60);
  }

  stop() {
    clearInterval(this.#fade);
    this.#fade = null;
    this.#a?.pause();
    this.#a = null;
  }
}
