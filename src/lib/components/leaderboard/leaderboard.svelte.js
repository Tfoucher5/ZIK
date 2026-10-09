// État de la page /classements : onglets, filtres, listes paginées et position
// du joueur connecté. Construit pendant l'initialisation du composant (les
// $effect du constructeur ont besoin de ce contexte).

const PAGE_SIZE = 20;

const asArray = (rows) => (Array.isArray(rows) ? rows : []);

const plural = (n, word) => `${n} ${word}${n > 1 ? "s" : ""}`;

/** Liste chargée par pages de 20 (ou d'un coup si paged est faux). */
class PagedList {
  rows = $state([]);
  hasMore = $state(false);
  loading = $state(false);
  inited = $state(false);
  #offset = 0;
  #fetchPage;
  #paged;

  constructor(fetchPage, { initial = null, paged = true } = {}) {
    this.#fetchPage = fetchPage;
    this.#paged = paged;
    if (initial) {
      this.rows = initial;
      this.#offset = initial.length;
      this.hasMore = paged && initial.length === PAGE_SIZE;
      this.inited = true;
    }
  }

  async load(reset = false) {
    this.loading = true;
    if (reset) {
      this.rows = [];
      this.#offset = 0;
      this.inited = false;
    }
    try {
      const rows = asArray(await this.#fetchPage(this.#offset));
      this.rows = reset ? rows : [...this.rows, ...rows];
      this.#offset += rows.length;
      this.hasMore = this.#paged && rows.length === PAGE_SIZE;
    } catch {
      /* liste laissée telle quelle */
    } finally {
      this.loading = false;
      this.inited = true;
    }
  }
}

const getJson = (url, init) => fetch(url, init).then((r) => r.json());

export class Leaderboard {
  tab = $state("elo");
  eloScope = $state("global");
  scoreMode = $state("classique");
  scoreRooms = $state("officielles");
  scorePeriod = $state("semaine");

  myUserId = $state(null);
  myRank = $state(null);
  myRankLoaded = $state(false);

  elo;
  score;
  cartes;
  friends;

  constructor({ eloTop20, getToken }) {
    this.elo = new PagedList(
      (offset) => getJson(`/api/leaderboard/elo?offset=${offset}`),
      { initial: eloTop20 ?? [] },
    );
    this.score = new PagedList((offset) =>
      getJson(`/api/leaderboard/score?${this.#scoreQuery()}&offset=${offset}`),
    );
    this.cartes = new PagedList((offset) =>
      getJson(`/api/leaderboard/cartes?offset=${offset}`),
    );
    this.friends = new PagedList(
      async () => {
        const token = await getToken();
        if (!token) return [];
        return getJson("/api/leaderboard/friends", {
          headers: { Authorization: `Bearer ${token}` },
        });
      },
      { paged: false },
    );

    $effect(() => {
      if (this.tab !== "score") return;
      void this.#scoreQuery();
      this.score.load(true);
    });
    $effect(() => {
      if (this.tab === "cartes" && !this.cartes.inited) this.cartes.load(true);
    });
    $effect(() => {
      if (this.eloAmis) this.friends.load(true);
    });
    $effect(() => {
      void this.tab;
      void this.eloScope;
      void this.#scoreQuery();
      void this.friends.rows;
      void this.myUserId;
      this.#loadMyRank();
    });
  }

  #scoreQuery() {
    return `mode=${this.scoreMode}&rooms=${this.scoreRooms}&periode=${this.scorePeriod}`;
  }

  eloAmis = $derived(this.tab === "elo" && this.eloScope === "amis");

  current = $derived(
    this.tab === "elo"
      ? this.eloAmis
        ? this.friends
        : this.elo
      : this.tab === "cartes"
        ? this.cartes
        : this.score,
  );

  list = $derived(this.current.rows);

  unit = $derived(this.tab === "elo" ? "ELO" : "pts");

  loadingFirst = $derived(
    this.current !== this.elo &&
      this.current.loading &&
      this.current.rows.length === 0,
  );

  empty = $derived(
    this.eloAmis
      ? this.friends.rows.length <= 1 &&
          this.friends.inited &&
          !this.friends.loading
      : this.current.rows.length === 0 &&
          this.current.inited &&
          !this.current.loading,
  );

  emptyTitle = $derived(
    this.eloAmis
      ? "Ajoute des amis pour te comparer à eux ici."
      : this.tab === "elo"
        ? "Aucun joueur pour l'instant"
        : this.tab === "cartes"
          ? "Aucune carte gagnée pour l'instant."
          : "Aucun résultat pour ces filtres.",
  );

  valueOf(p) {
    if (this.tab === "elo") return p.elo;
    if (this.tab === "cartes") return p.score;
    return Number(p.total_score);
  }

  maxVal = $derived(this.list.length > 0 ? this.valueOf(this.list[0]) : 1);

  valueLabel(p) {
    return this.tab === "elo"
      ? String(p.elo)
      : this.valueOf(p).toLocaleString("fr-FR");
  }

  metaOf(p) {
    if (this.tab === "cartes")
      return `${plural(p.cards, "carte")} · ${plural(p.sets, "set")}`;
    return plural(
      this.tab === "elo" ? p.games_played : p.games_count,
      "partie",
    );
  }

  countOf(p) {
    if (this.tab === "cartes") return p.cards;
    return this.tab === "elo" ? p.games_played : p.games_count;
  }

  pct(p) {
    return Math.min(100, Math.round((this.valueOf(p) / this.maxVal) * 100));
  }

  isMe(username) {
    return this.myRank?.username === username;
  }

  /** Points à prendre pour dépasser le joueur juste au-dessus. */
  gapToNext = $derived.by(() => {
    const me = this.myRank;
    if (!me || me.rank <= 1) return null;
    const above = this.list[me.rank - 2];
    return above ? this.valueOf(above) - me.score : null;
  });

  gapToTop = $derived(
    !this.myRank || this.myRank.rank <= 1 || this.list.length === 0
      ? null
      : this.maxVal - this.myRank.score,
  );

  progressPct = $derived.by(() => {
    const me = this.myRank;
    if (!me) return 0;
    if (me.rank <= 1) return 100;
    if (this.gapToNext > 0) {
      const above = me.score + this.gapToNext;
      return above > 0
        ? Math.min(100, Math.round((me.score / above) * 100))
        : 0;
    }
    return this.maxVal > 0
      ? Math.min(100, Math.round((me.score / this.maxVal) * 100))
      : 0;
  });

  async #loadMyRank() {
    if (!this.myUserId) return;
    this.myRankLoaded = false;
    if (this.eloAmis) {
      const rows = this.friends.rows;
      const idx = rows.findIndex((p) => p.id === this.myUserId);
      this.myRank =
        idx >= 0
          ? {
              rank: idx + 1,
              score: rows[idx].elo,
              games_count: rows[idx].games_played,
              username: rows[idx].username,
              avatar_url: rows[idx].avatar_url,
            }
          : null;
      this.myRankLoaded = true;
      return;
    }
    try {
      const mode = this.tab === "score" ? this.scoreMode : this.tab;
      let qs = `userId=${encodeURIComponent(this.myUserId)}&mode=${mode}`;
      if (this.tab === "score")
        qs += `&rooms=${this.scoreRooms}&periode=${this.scorePeriod}`;
      this.myRank = await getJson(`/api/leaderboard/my-rank?${qs}`);
    } catch {
      this.myRank = null;
    } finally {
      this.myRankLoaded = true;
    }
  }
}

export { plural };
