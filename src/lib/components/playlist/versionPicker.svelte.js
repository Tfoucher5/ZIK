import { extractYoutubeId } from "$lib/shared/youtube.js";
import { player } from "./previewPlayer.svelte.js";

// Version YouTube jouée en partie pour un titre de la playlist : écoute,
// alternatives, lien collé. Une version déjà fixée verrouille le titre.
export class VersionPickerState {
  loading = $state(true);
  locked = $state(false);
  lockedId = $state(null);
  candidates = $state([]);
  autoId = $state(null);
  selectedId = $state(null);
  pasteInput = $state("");
  error = $state("");
  busy = $state(false);

  pastedId = $derived(extractYoutubeId(this.pasteInput));
  pasteInvalid = $derived(!!this.pasteInput.trim() && !this.pastedId);
  effectiveId = $derived(this.pastedId || this.selectedId);
  playingId = $derived(
    player.current?.startsWith("yt:") ? player.current.slice(3) : null,
  );
  canSave = $derived(
    !this.busy && !this.locked && !this.pasteInvalid && !!this.effectiveId,
  );

  #api;

  constructor(track, api) {
    this.track = track;
    this.#api = api;
    if (track.youtube_id) {
      this.locked = true;
      this.lockedId = track.youtube_id;
      this.loading = false;
      this.play(track.youtube_id);
    } else this.#load();
  }

  async #load() {
    const { artist, title } = this.track;
    try {
      const data = await this.#api(
        `/api/tracks/versions?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`,
      );
      if (data.locked) {
        this.locked = true;
        this.lockedId = data.video.id;
      } else {
        this.candidates = data.candidates;
        this.autoId = data.autoId;
        this.selectedId = data.autoId;
        if (!data.candidates.length)
          this.error =
            "Aucune version trouvée automatiquement : colle un lien YouTube.";
      }
      if (this.lockedId || this.autoId) this.play(this.lockedId || this.autoId);
    } catch (e) {
      this.error = e.message;
    }
    this.loading = false;
  }

  play(id) {
    if (this.playingId === id) player.stop();
    else player.claim(`yt:${id}`);
  }

  select(id) {
    this.selectedId = id;
    this.pasteInput = "";
  }

  async save() {
    if (!this.canSave) return null;
    this.busy = true;
    try {
      const { youtube_id } = await this.#api(
        `/api/tracks/${this.track.track_id}/video`,
        {
          method: "POST",
          body: { youtube_id: this.effectiveId },
        },
      );
      this.locked = true;
      this.lockedId = youtube_id;
      return youtube_id;
    } catch (e) {
      this.error = e.message;
      return null;
    } finally {
      this.busy = false;
    }
  }
}
