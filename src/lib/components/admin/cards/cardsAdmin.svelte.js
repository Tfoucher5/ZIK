import { goto } from "$app/navigation";
import { page } from "$app/state";
import { SvelteURLSearchParams } from "svelte/reactivity";

export const nf = (n) => (n ?? 0).toLocaleString("fr-FR");
export const plural = (n, word) => `${nf(n)} ${word}${n > 1 ? "s" : ""}`;

// État partagé par les sections de l'écran admin des cartes : filtres dans
// l'URL, envoi des formulaires, fenêtres de confirmation et de correction.
export class CardsAdmin {
  busy = $state(false);
  confirm = $state(null);
  confirmOpen = $state(false);
  fixing = $state(null);
  fixOpen = $state(false);
  // Recherche de carte, partagée par les raretés et le moteur de recherche
  search = $state(page.url.searchParams.get("q") ?? "");
  #data;

  constructor(getData) {
    this.#data = getData;
  }

  href = (changes) => {
    const p = new SvelteURLSearchParams(page.url.searchParams);
    for (const [k, v] of Object.entries(changes)) {
      if (v) p.set(k, String(v));
      else p.delete(k);
    }
    const s = p.toString();
    return s ? `?${s}` : page.url.pathname;
  };

  go = (changes) =>
    goto(this.href(changes), { keepFocus: true, noScroll: true });

  ask = (action, fields, title, text) => {
    this.confirm = { action, fields, title, text };
    this.confirmOpen = true;
  };

  fix = (card, reportId = null) => {
    this.fixing = { card, reportId };
    this.fixOpen = true;
  };

  submitting = () => {
    this.busy = true;
    return async ({ result, update }) => {
      this.busy = false;
      if (result.type === "success" && result.data?.success) {
        this.confirmOpen = false;
        this.fixOpen = false;
        if (result.data.corrected && this.#data().cardNumber)
          await this.go({ card: null });
      }
      await update({ reset: false });
    };
  };
}
