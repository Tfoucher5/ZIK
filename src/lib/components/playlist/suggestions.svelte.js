import { pickSeeds } from "$lib/playlist/suggest.js";

const PAGE = 8;

// Propositions figées au chargement : un ajout passe le titre en ✓ sans rien
// remplacer, et une recherche ne les fait pas recharger. Nouveau calcul
// seulement en changeant de playlist ou via « ↻ Autres » en fin de liste.
export class SuggestionsState {
  pool = $state([]);
  offset = $state(0);
  loading = $state(false);
  loadedFor = $state(null);

  shown = $derived(this.pool.slice(this.offset, this.offset + PAGE));

  #store;

  constructor(store) {
    this.#store = store;
  }

  get hasSeeds() {
    return pickSeeds(this.#store.tracks).length > 0;
  }

  needsLoad() {
    return this.loadedFor !== this.#store.current?.id && this.hasSeeds;
  }

  async load() {
    const ids = pickSeeds(this.#store.tracks);
    if (!ids.length) return;
    if (this.loadedFor !== this.#store.current?.id) this.pool = [];
    this.loadedFor = this.#store.current?.id;
    this.loading = true;
    try {
      const r = await fetch(`/api/deezer/suggest?ids=${ids.join(",")}`);
      if (r.ok) {
        this.pool = (await r.json()).filter((t) => !this.#store.find(t));
        this.offset = 0;
      }
    } catch {
      /* suggestions facultatives */
    }
    this.loading = false;
  }

  more() {
    if (this.offset + PAGE < this.pool.length) this.offset += PAGE;
    else this.load();
  }
}
