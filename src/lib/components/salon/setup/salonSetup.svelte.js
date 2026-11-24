import { loadSalonPlaylists } from "../../../data/salonPlaylists.js";
import { FREE_MAX_TEAMS } from "../../../data/proPlans.js";
import {
  saveSalonKey,
  fetchPro,
  proActive,
  goToStripe,
  saveSetup,
  readSetup,
  setupFor,
} from "../../../client/salonClient.js";

const KEYS = [
  "maxRounds",
  "roundDuration",
  "answerMode",
  "manualNext",
  "showAnswerDuration",
  "teamCount",
  "specials",
  "title",
];

// Sans défaut : seules les playlists demandées (?playlist=) ou celles de la dernière préparation sont cochées
export function initialSelection(list, wanted, remembered) {
  const known = (ids) => ids.filter((id) => list.some((p) => p.id === id));
  const w = known(wanted);
  return w.length ? w : known(remembered);
}

export class SalonSetup {
  maxRounds = $state(10);
  roundDuration = $state(30);
  answerMode = $state("multiple");
  manualNext = $state(false);
  showAnswerDuration = $state(7);
  teamCount = $state(0);
  specials = $state(false);
  title = $state("");

  proRow = $state(null);
  pro = $derived(proActive(this.proRow));
  portalBusy = $state(false);
  upsell = $state(null);

  playlists = $state([]);
  selectedIds = $state([]);
  playlistsState = $state("loading");
  creating = $state(false);
  error = $state("");

  totalTracks = $derived(
    this.playlists
      .filter((p) => this.selectedIds.includes(p.id))
      .reduce((s, p) => s + (p.trackCount || 0), 0),
  );

  // Pas plus de manches que de titres : la partie fera ce nombre-là
  manchesJouees = $derived(
    this.selectedIds.length
      ? Math.min(this.maxRounds, this.totalTracks)
      : this.maxRounds,
  );

  #defaults = this.settings();
  // Dernière préparation lue au montage ; la part réservée à Pro attend fetchPro
  #saved = null;
  #freeSetup = null;
  #seq = 0;
  #userId = null;

  /** @param {URLSearchParams} params ?playlist= (lien depuis /blind-test/<thème>) et ?ref= */
  constructor(zik, params) {
    this.zik = zik;
    this.params = params;
  }

  settings() {
    return Object.fromEntries(KEYS.map((k) => [k, this[k]]));
  }

  #apply(s) {
    for (const k of KEYS) this[k] = s[k];
  }

  restore() {
    this.#saved = readSetup(this.#defaults);
    if (!this.#saved) return;
    this.#freeSetup = setupFor(this.#saved.settings, false, this.#defaults);
    this.#apply(this.#freeSetup);
  }

  // Une seule fois, et seulement sur les réglages que l'hôte n'a pas touchés entre-temps
  #restorePro() {
    if (!this.#freeSetup) return;
    const full = setupFor(this.#saved.settings, true, this.#defaults);
    const now = this.settings();
    for (const k of ["answerMode", "specials", "teamCount"])
      if (now[k] === this.#freeSetup[k]) now[k] = full[k];
    this.#apply(now);
    this.#freeSetup = null;
  }

  // Connexion ou déconnexion pendant un chargement : seul le dernier appel compte
  async load(userId = this.#userId) {
    this.#userId = userId;
    const seq = ++this.#seq;
    const sb = this.zik.sb;
    fetchPro(sb, userId)
      .then((r) => {
        if (seq !== this.#seq) return;
        this.proRow = r;
        if (proActive(r)) this.#restorePro();
      })
      .catch(() => {});
    if (this.playlistsState === "error") this.playlistsState = "loading";
    try {
      const list = await loadSalonPlaylists(sb, userId);
      if (seq !== this.#seq) return;
      this.playlists = list;
      this.playlistsState = "ok";
      // Déconnexion : ses propres playlists ne sont plus proposées, elles sortent de la sélection
      const kept = initialSelection(list, this.selectedIds, []);
      if (kept.length || this.selectedIds.length) {
        this.selectedIds = kept;
        return;
      }
      const wanted = (this.params.get("playlist") ?? "").split(",");
      this.selectedIds = initialSelection(
        list,
        wanted,
        this.#saved?.playlistIds ?? [],
      );
    } catch {
      if (seq === this.#seq) this.playlistsState = "error";
    }
  }

  pickTeams(n) {
    if (!this.pro && n > FREE_MAX_TEAMS) this.upsell = "teams";
    else this.teamCount = n;
  }

  proOnly(feature, fn) {
    if (this.pro) fn();
    else this.upsell = feature;
  }

  async openPortal() {
    this.portalBusy = true;
    try {
      await goToStripe(this.zik.sb, "/api/pro/portal");
    } catch (e) {
      this.error = e.message;
      this.portalBusy = false;
    }
  }

  async create() {
    this.error = "";
    if (!this.selectedIds.length) {
      this.error = "Choisis au moins une playlist.";
      return;
    }
    this.creating = true;
    try {
      const session = this.zik.sb
        ? (await this.zik.sb.auth.getSession()).data.session
        : null;
      const headers = { "content-type": "application/json" };
      if (session) headers.Authorization = `Bearer ${session.access_token}`;
      const res = await fetch("/api/salon", {
        method: "POST",
        headers,
        body: JSON.stringify({
          origin: this.params.get("ref"),
          playlistIds: this.selectedIds,
          settings: this.settings(),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          d.error ||
            "La soirée n'a pas pu être créée. Réessaie dans un instant.",
        );
      saveSalonKey(d.code, d.key);
      saveSetup(this.selectedIds, this.settings());
      window.location.href = `/salon/host?code=${d.code}`;
    } catch (e) {
      // fetch rejette en TypeError quand le réseau coupe : jamais de message brut du navigateur
      this.error =
        e instanceof TypeError ? "La connexion a coupé. Réessaie." : e.message;
      this.creating = false;
    }
  }
}
