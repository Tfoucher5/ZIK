<script>
  import { getContext } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Card from './Card.svelte';
  import CardViewer from './CardViewer.svelte';
  import { RARITIES, RARITY_ORDER } from './rarity.js';

  /** Collection d'un joueur : la sienne (/collection) ou celle d'un autre. */
  let { username } = $props();

  const _ctx = getContext('zik');
  const sb = _ctx.sb;

  const STEP = 60;
  const VIEWS = [
    ['toutes', 'Toutes'],
    ['artistes', 'Artistes'],
    ['albums', 'Albums'],
  ];
  // Vues Artistes et Albums : tri et état des sets
  const GROUP_SORTS = [
    ['progression', 'Progression'],
    ['presque', 'Presque terminés'],
    ['cartes', 'Plus de cartes'],
    ['nom', 'De A à Z'],
  ];
  const STATES = [
    ['', 'Tous les sets'],
    ['termines', 'Terminés'],
    ['a-completer', 'À compléter'],
  ];
  const SORTS = [
    ['recentes', 'Plus récentes'],
    ['rarete', 'Rareté'],
    ['artiste', 'Artiste'],
    ['titre', 'Titre'],
  ];

  let data = $state(null);
  let status = $state('loading'); // loading | ready | private | error | login
  let shown = $state(STEP);
  let setDetail = $state(null);
  let setLoading = $state(false);

  // État de la page gardé dans l'adresse : lien partageable, bouton retour fiable
  const params = $derived($page.url.searchParams);
  const view = $derived(params.get('vue') || 'toutes');
  const q = $derived(params.get('q') || '');
  const rarity = $derived(params.get('rarete') || '');
  const genre = $derived(params.get('genre') || '');
  const decade = $derived(params.get('decennie') || '');
  const sort = $derived(params.get('tri') || 'recentes');
  const setId = $derived(params.get('set') || '');
  const groupSort = $derived(params.get('ordre') || 'progression');
  const setState = $derived(params.get('etat') || '');

  function setParam(changes) {
    const url = new URL($page.url);
    for (const [k, v] of Object.entries(changes)) {
      if (v === '' || v == null || v === false) url.searchParams.delete(k);
      else url.searchParams.set(k, v === true ? '1' : v);
    }
    shown = STEP;
    goto(url, { replaceState: !('set' in changes), keepFocus: true, noScroll: true });
  }

  // Chargement au fil du défilement : le bouton « Afficher plus » se déclenche
  // seul quand il approche de l'écran (il reste utilisable au clavier)
  function autoMore(node) {
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        node.click();
        // Toujours visible après l'ajout (grand écran) : on revérifie
        io.unobserve(node);
        requestAnimationFrame(() => io.observe(node));
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(node);
    return { destroy: () => io.disconnect() };
  }

  async function authHeaders() {
    const token = (await sb?.auth.getSession())?.data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : null;
  }

  async function load(name = username) {
    const headers = await authHeaders();
    if (!headers) {
      status = 'login';
      return;
    }
    const r = await fetch(`/api/cards/collection/${encodeURIComponent(name)}`, { headers }).catch(() => null);
    if (r?.status === 403) status = 'private';
    else if (!r?.ok) status = 'error';
    else {
      data = await r.json();
      status = 'ready';
    }
  }

  $effect(() => {
    const name = username;
    status = 'loading';
    load(name);
  });

  $effect(() => {
    if (!setId) {
      setDetail = null;
      return;
    }
    setLoading = true;
    authHeaders().then(async (headers) => {
      const r = await fetch(`/api/cards/set/${setId}?user=${encodeURIComponent(username)}`, {
        headers: headers ?? {},
      }).catch(() => null);
      setDetail = r?.ok ? await r.json() : null;
      setLoading = false;
    });
  });

  const decadeOf = (year) => (year ? `${Math.floor(year / 10) * 10}` : '');
  const decadeLabel = (d) => (Number(d) >= 2000 ? `Années ${d}` : `Années ${String(d).slice(2)}`);
  const norm = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();

  const cards = $derived(data?.cards ?? []);
  const counts = $derived(
    Object.fromEntries(RARITY_ORDER.map((r) => [r, cards.filter((c) => c.rarity === r).length])),
  );
  const genres = $derived([...new Set(cards.map((c) => c.genre).filter(Boolean))].sort());
  const decades = $derived([...new Set(cards.map((c) => decadeOf(c.year)).filter(Boolean))].sort());
  const completedSets = $derived((data?.sets ?? []).filter((s) => s.completedAt).length);
  // Objectif : tout le catalogue, et chaque rareté
  const catalog = $derived(data?.catalog ?? { total: 0, byRarity: {} });
  const fmt = (n) => n.toLocaleString('fr-FR');
  // Au moins un trait visible dès la première carte
  const pct = (n, total) => (total ? `${n ? Math.max(1.5, (n / total) * 100) : 0}%` : '0%');

  const filtered = $derived.by(() => {
    const needle = norm(q);
    const list = cards.filter(
      (c) =>
        (!rarity || c.rarity === rarity) &&
        (!genre || c.genre === genre) &&
        (!decade || decadeOf(c.year) === decade) &&
        (!needle || norm(`${c.title} ${c.artist} ${c.album}`).includes(needle)),
    );
    const rank = (c) => RARITY_ORDER.indexOf(c.rarity);
    const by = {
      recentes: (a, b) => String(b.obtainedAt).localeCompare(String(a.obtainedAt)),
      rarete: (a, b) => rank(b) - rank(a) || b.rank - a.rank,
      artiste: (a, b) => a.artist.localeCompare(b.artist, 'fr') || a.title.localeCompare(b.title, 'fr'),
      titre: (a, b) => a.title.localeCompare(b.title, 'fr'),
    }[sort];
    return [...list].sort(by);
  });

  // Photo d'artiste servie par Deezer à partir de son id (rien à stocker) ;
  // la pochette reprend la place si elle ne charge pas
  const artistPhoto = (id) => `https://api.deezer.com/artist/${id}/image?size=big`;
  function photoFallback(e, cover) {
    e.currentTarget.onerror = null;
    e.currentTarget.src = cover;
    e.currentTarget.classList.remove('is-artist');
  }

  // Groupes artiste / album : progression du set quand il existe (3 cartes
  // et plus dans ZIK), sinon simple compte des cartes possédées
  const groups = $derived.by(() => {
    if (view === 'toutes') return [];
    const kind = view === 'artistes' ? 'artist' : 'album';
    const keyOf = (c) => String(kind === 'artist' ? c.artistId : c.albumId);
    const sets = new Map((data?.sets ?? []).filter((s) => s.kind === kind).map((s) => [s.key, s]));
    const byKey = {};
    for (const c of filtered) {
      const key = keyOf(c);
      if (!key || key === 'null') continue;
      byKey[key] ??= {
        key,
        set: sets.get(key),
        name: sets.get(key)?.name ?? (kind === 'artist' ? c.artist : c.album),
        cover: sets.get(key)?.cover ?? c.coverMd,
        photo: kind === 'artist' ? artistPhoto(key) : null,
        cards: [],
      };
      byKey[key].cards.push(c);
    }
    // Progression d'un groupe : 0 à 1 pour un set, -1 sans set (moins de
    // 3 cartes dans ZIK) pour finir en bas de liste
    const ratio = (g) => (g.set ? g.set.owned / g.set.total : -1);
    const left = (g) => (g.set && !g.set.completedAt ? g.set.total - g.set.owned : Infinity);
    const byName = (a, b) => a.name.localeCompare(b.name, 'fr');
    const by = {
      progression: (a, b) =>
        Number(!!b.set?.completedAt) - Number(!!a.set?.completedAt) || ratio(b) - ratio(a) || byName(a, b),
      presque: (a, b) => left(a) - left(b) || ratio(b) - ratio(a) || byName(a, b),
      cartes: (a, b) => b.cards.length - a.cards.length || byName(a, b),
      nom: byName,
    }[groupSort] ?? byName;
    return Object.values(byKey)
      .filter(
        (g) =>
          !setState ||
          (setState === 'termines' ? !!g.set?.completedAt : !!g.set && !g.set.completedAt),
      )
      .sort(by);
  });

  const hasFilters = $derived(!!(q || rarity || genre || decade || (view !== 'toutes' && setState)));
  const pendingLabel = (c) => {
    const h = Math.max(1, Math.ceil((new Date(c.visibleAt).getTime() - Date.now()) / 36e5));
    return `Disponible dans ${h} h`;
  };
</script>

<CardViewer />

<div class="col">
  {#if status === 'loading'}
    <p class="col-msg" role="status">Chargement de la collection…</p>
  {:else if status === 'login'}
    <div class="col-empty">
      <p class="col-empty-title">Connecte-toi pour voir les collections</p>
      <p>Les cartes se gagnent en jouant avec un compte.</p>
      <button type="button" class="col-btn" onclick={() => _ctx.openAuthModal?.('login')}>Se connecter</button>
    </div>
  {:else if status === 'private'}
    <div class="col-empty">
      <p class="col-empty-title">Collection privée</p>
      <p>{username} a choisi de garder son profil privé.</p>
    </div>
  {:else if status === 'error'}
    <div class="col-empty">
      <p class="col-empty-title">La collection n'a pas pu être chargée</p>
      <button type="button" class="col-btn" onclick={() => load()}>Réessayer</button>
    </div>
  {:else if setId}
    <!-- Détail d'un set : possédées en clair, manquantes en silhouette -->
    <section class="col-set" aria-labelledby="set-title">
      <button type="button" class="col-back" onclick={() => setParam({ set: '' })}>
        ← {view === 'albums' ? 'Albums' : 'Artistes'}
      </button>
      {#if setLoading}
        <p class="col-msg" role="status">Chargement du set…</p>
      {:else if setDetail}
        {@const owned = setDetail.cards.filter((c) => c.owned).length}
        <header class="col-set-head">
          {#if setDetail.set.kind === 'artist'}
            <img src={artistPhoto(setDetail.set.key)} alt="" class="col-set-cover is-artist" onerror={(e) => photoFallback(e, setDetail.set.cover_url)} />
          {:else if setDetail.set.cover_url}
            <img src={setDetail.set.cover_url} alt="" class="col-set-cover" />
          {/if}
          <div>
            <p class="col-kicker">{setDetail.set.kind === 'album' ? 'Album' : 'Artiste'}</p>
            <h2 id="set-title" class="col-set-title">{setDetail.set.name}</h2>
            <div class="col-progress" role="img" aria-label={`${owned} cartes sur ${setDetail.cards.length}`}>
              <span style:width={`${(owned / setDetail.cards.length) * 100}%`}></span>
            </div>
            <p class="col-set-count">
              {owned} / {setDetail.cards.length} cartes{#if owned === setDetail.cards.length}<strong>, set complet</strong>{/if}
            </p>
          </div>
        </header>
        <ul class="col-grid">
          {#each setDetail.cards as c (c.id)}
            <li>
              {#if c.owned}
                <Card card={c} size="sm" inspectable list={setDetail.cards.filter((x) => x.owned)} />
              {:else}
                <Card card={c} size="sm" face="silhouette" motion="none" />
              {/if}
            </li>
          {/each}
        </ul>
      {:else}
        <p class="col-msg">Ce set est introuvable.</p>
      {/if}
    </section>
  {:else}
    <header class="col-head">
      <div>
        <h1 class="col-title">{data.isOwner ? 'Ma collection' : `Collection de ${data.profile.username}`}</h1>
        <p class="col-sub">
          <strong class="col-total">{fmt(cards.length)}</strong> / {fmt(catalog.total)} cartes{#if completedSets}, {completedSets} set{completedSets > 1 ? 's' : ''} complété{completedSets > 1 ? 's' : ''}{/if}
        </p>
        <div class="col-progress col-progress-total" role="img" aria-label={`${cards.length} cartes sur ${catalog.total}`}>
          <span style:width={pct(cards.length, catalog.total)}></span>
        </div>
      </div>
      <div>
      <p class="col-rar-title" id="col-rar-title">Par rareté, touche pour filtrer</p>
      <div class="col-rarities" role="group" aria-labelledby="col-rar-title">
        {#each RARITY_ORDER as r (r)}
          <button
            type="button"
            class="col-rar"
            data-rarity={r}
            aria-pressed={rarity === r}
            disabled={!counts[r]}
            onclick={() => setParam({ rarete: rarity === r ? '' : r })}
          >
            <span class="col-rar-disc" aria-hidden="true"></span>
            <span class="col-rar-label">{RARITIES[r].label}</span>
            <strong>{counts[r]}<small>&nbsp;/&nbsp;{fmt(catalog.byRarity[r] ?? 0)}</small></strong>
            <span class="col-rar-bar" aria-hidden="true"><i style:width={pct(counts[r], catalog.byRarity[r])}></i></span>
          </button>
        {/each}
      </div>
      </div>
    </header>

    {#if !cards.length}
      <div class="col-empty">
        <p class="col-empty-title">
          {data.isOwner ? 'Ta collection est vide pour le moment' : `${data.profile.username} n'a pas encore de carte`}
        </p>
        {#if data.isOwner}
          <p>Trouve un titre en premier dans une partie à plusieurs pour gagner sa carte.</p>
          <a class="col-btn" href="/rooms">Trouver une room</a>
        {/if}
      </div>
    {:else}
      <div class="col-tools">
        <label class="col-search">
          <span class="sr-only">Rechercher une carte</span>
          <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="M14 14l4 4" /></svg>
          <input
            type="search"
            placeholder="Titre, artiste ou album"
            value={q}
            oninput={(e) => setParam({ q: e.currentTarget.value })}
          />
        </label>

        <div class="col-seg" role="group" aria-label="Vue">
          {#each VIEWS as [value, text] (value)}
            <button type="button" aria-pressed={view === value} onclick={() => setParam({ vue: value === 'toutes' ? '' : value })}>
              {text}
            </button>
          {/each}
        </div>

        <div class="col-selects">
          {#if view === 'toutes'}
            <label>
              <span class="sr-only">Trier par</span>
              <select value={sort} onchange={(e) => setParam({ tri: e.currentTarget.value === 'recentes' ? '' : e.currentTarget.value })}>
                {#each SORTS as [value, text] (value)}<option {value}>{text}</option>{/each}
              </select>
            </label>
          {:else}
            <label>
              <span class="sr-only">Trier les sets par</span>
              <select value={groupSort} onchange={(e) => setParam({ ordre: e.currentTarget.value === 'progression' ? '' : e.currentTarget.value })}>
                {#each GROUP_SORTS as [value, text] (value)}<option {value}>{text}</option>{/each}
              </select>
            </label>
            <label>
              <span class="sr-only">État des sets</span>
              <select value={setState} onchange={(e) => setParam({ etat: e.currentTarget.value })}>
                {#each STATES as [value, text] (value)}<option {value}>{text}</option>{/each}
              </select>
            </label>
          {/if}
          <label>
            <span class="sr-only">Genre</span>
            <select value={genre} onchange={(e) => setParam({ genre: e.currentTarget.value })}>
              <option value="">Tous genres</option>
              {#each genres as g (g)}<option value={g}>{g}</option>{/each}
            </select>
          </label>
          <label>
            <span class="sr-only">Décennie</span>
            <select value={decade} onchange={(e) => setParam({ decennie: e.currentTarget.value })}>
              <option value="">Toutes décennies</option>
              {#each decades as d (d)}<option value={d}>{decadeLabel(d)}</option>{/each}
            </select>
          </label>
        </div>
      </div>

      <p class="col-count" role="status" aria-live="polite">
        {#if view === 'toutes'}
          {filtered.length} carte{filtered.length > 1 ? 's' : ''}
        {:else}
          {groups.length} {view === 'artistes' ? 'artiste' : 'album'}{groups.length > 1 ? 's' : ''}
        {/if}
        {#if hasFilters}
          <button type="button" class="col-reset" onclick={() => setParam({ q: '', rarete: '', genre: '', decennie: '', etat: '' })}>
            Effacer les filtres
          </button>
        {/if}
      </p>

      {#if view === 'toutes'}
        {#if filtered.length}
          <ul class="col-grid">
            {#each filtered.slice(0, shown) as c (c.id)}
              <li class="col-item">
                <Card card={c} size="sm" inspectable list={filtered} />
                {#if c.pending}<span class="col-pending">{pendingLabel(c)}</span>{/if}
              </li>
            {/each}
          </ul>
          {#if filtered.length > shown}
            <button type="button" class="col-more" use:autoMore onclick={() => (shown += STEP)}>
              Afficher {Math.min(STEP, filtered.length - shown)} cartes de plus
            </button>
          {/if}
        {:else}
          <p class="col-msg">Aucune carte ne correspond à ces filtres.</p>
        {/if}
      {:else}
        <ul class="col-groups">
          {#each groups.slice(0, shown) as g (g.key)}
            <li>
              <button
                type="button"
                class="col-group"
                class:is-done={g.set?.completedAt}
                disabled={!g.set}
                onclick={() => setParam({ set: g.set.id })}
              >
                {#if g.set?.completedAt}<span class="col-done-badge">✓ Set complet</span>{/if}
                {#if g.photo}
                  <img src={g.photo} alt="" loading="lazy" class="is-artist" onerror={(e) => photoFallback(e, g.cover)} />
                {:else}
                  <img src={g.cover} alt="" loading="lazy" />
                {/if}
                <span class="col-group-name">{g.name}</span>
                {#if g.set}
                  <span class="col-progress" aria-hidden="true">
                    <span style:width={`${(g.set.owned / g.set.total) * 100}%`}></span>
                  </span>
                  <span class="col-group-count">
                    {g.set.completedAt ? `${g.set.total} / ${g.set.total} cartes` : `${g.set.owned} / ${g.set.total} cartes`}
                  </span>
                {:else}
                  <span class="col-group-count">{g.cards.length} carte{g.cards.length > 1 ? 's' : ''}</span>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
        {#if groups.length > shown}
          <button type="button" class="col-more" use:autoMore onclick={() => (shown += STEP)}>Afficher plus</button>
        {/if}
      {/if}
    {/if}
  {/if}
</div>

<style>
  /* Pleine largeur : la grille gagne des colonnes avec l'écran */
  .col {
    width: 100%;
    max-width: 1920px;
    margin: 0 auto;
    padding: calc(var(--nav-h) + 28px) clamp(16px, 4vw, 56px) 96px;
    color: var(--text);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .col-head {
    display: grid;
    gap: 18px;
  }

  .col-title {
    margin: 0;
    font: 700 clamp(2.2rem, 5vw, 3.4rem) / 1 'Barlow Condensed', sans-serif;
  }

  .col-sub {
    margin: 6px 0 0;
    color: var(--mid);
  }

  .col-rar-title {
    margin: 0 0 8px;
    font: 600 0.82rem/1.2 'Barlow', sans-serif;
    color: var(--mid);
  }

  .col-rarities {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
  }

  /* Nom, puis possédées / total, puis la barre : rien ne déborde, même étroit */
  .col-rar {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 8px 10px;
    min-width: 0;
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    color: var(--text);
    font: 600 0.92rem/1 'Barlow', sans-serif;
    text-align: left;
    cursor: pointer;
  }

  .col-rar strong {
    font: 700 1.15rem/1 'Barlow Condensed', sans-serif;
    font-variant-numeric: tabular-nums;
  }

  .col-rar[aria-pressed='true'] {
    border-color: var(--rc);
    box-shadow: inset 0 0 0 1px var(--rc);
    background: color-mix(in oklab, var(--rc) 14%, var(--surface));
  }

  .col-rar strong {
    grid-column: 1 / -1;
    white-space: nowrap;
  }

  .col-rar-label {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .col-rar strong small {
    font: 600 0.8rem/1 'Barlow', sans-serif;
    color: var(--mid);
  }

  /* Progression vers toutes les cartes de la rareté */
  .col-rar-bar {
    grid-column: 1 / -1;
    height: 4px;
    border-radius: 2px;
    background: var(--surface2);
    overflow: hidden;
  }

  .col-rar-bar i {
    display: block;
    height: 100%;
    background: var(--rc);
  }

  /* Rareté pas encore commencée : l'objectif reste lisible */
  .col-rar:disabled {
    opacity: 0.7;
    cursor: default;
  }

  .col-total {
    color: var(--text);
    font: 700 1.25rem/1 'Barlow Condensed', sans-serif;
  }

  .col-progress-total {
    max-width: 420px;
    margin-top: 10px;
  }

  .col-rar-disc {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background:
      radial-gradient(circle, #0a0a0c 0 12%, transparent 13%),
      radial-gradient(circle, var(--rc-light), var(--rc) 70%);
  }

  .col-rar[data-rarity='mythic'] .col-rar-disc {
    background:
      radial-gradient(circle, #0a0a0c 0 12%, transparent 13%),
      conic-gradient(#ff8ade, #d4a5ff, #8ff0ff, #ffc6ee, #ff8ade);
  }

  .col-tools {
    position: sticky;
    top: calc(var(--nav-h) + 8px);
    z-index: 5;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-top: 24px;
    padding: 10px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--nav-bg);
    backdrop-filter: blur(12px);
  }

  .col-search {
    display: flex;
    flex: 1 1 240px;
    align-items: center;
    gap: 8px;
    min-height: 42px;
    padding: 0 12px;
    border: 1px solid var(--border2);
    border-radius: 99px;
    background: var(--surface);
  }

  .col-search:focus-within {
    border-color: var(--accent);
  }

  .col-search svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: var(--mid);
    stroke-width: 2;
    stroke-linecap: round;
  }

  .col-search input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: none;
    color: var(--text);
    font: 500 0.95rem/1 'Barlow', sans-serif;
    outline: none;
  }

  .col-seg {
    display: inline-flex;
    padding: 3px;
    border: 1px solid var(--border);
    border-radius: 99px;
    background: var(--surface);
  }

  .col-seg button {
    min-height: 34px;
    padding: 0 14px;
    border: 0;
    border-radius: 99px;
    background: none;
    color: var(--mid);
    font: 600 0.9rem/1 'Barlow', sans-serif;
    cursor: pointer;
  }

  .col-seg button[aria-pressed='true'] {
    background: var(--text);
    color: var(--bg);
  }

  .col-selects {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  /* Les options suivent le thème : sinon texte clair sur fond système blanc */
  .col-selects option {
    background-color: var(--bg2);
    color: var(--text);
  }

  .col-selects select {
    min-height: 38px;
    padding: 0 10px;
    border: 1px solid var(--border2);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font: 500 0.88rem/1 'Barlow', sans-serif;
  }


  .col-count {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin: 18px 0 14px;
    font: 500 0.9rem/1 'Barlow', sans-serif;
    color: var(--mid);
  }

  .col-reset {
    padding: 0;
    border: 0;
    background: none;
    color: var(--accent);
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }

  .col-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 22px 14px;
    justify-items: center;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .col-grid > li {
    content-visibility: auto;
    contain-intrinsic-size: 150px 210px;
  }

  .col-item {
    position: relative;
  }

  .col-pending {
    position: absolute;
    right: 6px;
    bottom: 6px;
    left: 6px;
    padding: 4px 6px;
    border-radius: 6px;
    background: rgb(0 0 0 / 0.75);
    color: #fff;
    font: 600 0.7rem/1.2 'Barlow', sans-serif;
    text-align: center;
  }

  .col-groups {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 14px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .col-group {
    display: grid;
    gap: 8px;
    width: 100%;
    padding: 10px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .col-group:disabled {
    cursor: default;
  }

  .col-group:not(:disabled):hover {
    border-color: var(--border2);
  }

  .col-group {
    position: relative;
  }

  /* Set terminé : doré, il doit se repérer d'un coup d'œil */
  .col-group.is-done {
    border: 2px solid var(--rarity-legendary);
    background: linear-gradient(160deg, color-mix(in oklab, var(--rarity-legendary) 22%, var(--surface)), var(--surface) 70%);
    box-shadow: 0 8px 26px color-mix(in oklab, var(--rarity-legendary) 30%, transparent);
  }

  .col-group.is-done .col-group-count {
    color: var(--text);
    font-weight: 700;
  }

  .col-done-badge {
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 1;
    padding: 5px 10px;
    border-radius: 99px;
    background: var(--rarity-legendary);
    color: #1a1204;
    font: 700 0.78rem/1 'Barlow', sans-serif;
    box-shadow: 0 4px 12px rgb(0 0 0 / 0.25);
  }

  .col-group img {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 8px;
    object-fit: cover;
  }

  /* Photo d'artiste ronde, comme sur les plateformes de streaming */
  .col-group img.is-artist,
  .col-set-cover.is-artist {
    border-radius: 50%;
  }

  .col-group-name {
    overflow: hidden;
    font: 700 1.05rem/1.1 'Barlow Condensed', sans-serif;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .col-group-count {
    font: 500 0.82rem/1 'Barlow', sans-serif;
    color: var(--mid);
  }

  .col-progress {
    display: block;
    height: 5px;
    border-radius: 3px;
    background: var(--surface2);
    overflow: hidden;
  }

  .col-progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--accent);
  }

  .col-group.is-done .col-progress span {
    background: var(--rarity-legendary);
  }

  .col-more,
  .col-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    margin-top: 22px;
    padding: 0 20px;
    border: 1px solid var(--border2);
    border-radius: 99px;
    background: var(--surface);
    color: var(--text);
    font: 600 0.92rem/1 'Barlow', sans-serif;
    text-decoration: none;
    cursor: pointer;
  }

  .col-btn {
    border-color: transparent;
    background: var(--accent);
    color: var(--on-accent, #fff);
  }

  .col-more {
    display: flex;
    margin-inline: auto;
  }

  .col-empty {
    display: grid;
    justify-items: center;
    gap: 6px;
    max-width: 460px;
    margin: 60px auto;
    text-align: center;
    color: var(--mid);
  }

  .col-empty-title {
    margin: 0;
    font: 700 1.6rem/1.1 'Barlow Condensed', sans-serif;
    color: var(--text);
  }

  .col-empty p {
    margin: 0;
  }

  .col-msg {
    margin: 40px 0;
    color: var(--mid);
    text-align: center;
  }

  .col-back {
    margin-bottom: 18px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--mid);
    font: 600 0.95rem/1 'Barlow', sans-serif;
    cursor: pointer;
  }

  .col-set-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 20px;
    margin-bottom: 26px;
  }

  .col-set-cover {
    width: 120px;
    height: 120px;
    border-radius: 10px;
    object-fit: cover;
    box-shadow: 0 12px 30px rgb(0 0 0 / 0.3);
  }

  .col-kicker {
    margin: 0;
    font: 600 0.8rem/1 'Barlow', sans-serif;
    color: var(--mid);
  }

  .col-set-title {
    margin: 4px 0 10px;
    font: 700 clamp(1.8rem, 4vw, 2.6rem) / 1 'Barlow Condensed', sans-serif;
  }

  .col-set-count {
    margin: 8px 0 0;
    font-size: 0.9rem;
    color: var(--mid);
  }

  .col-set-head .col-progress {
    width: min(320px, 70vw);
  }

  /* Téléphone : la barre d'outils ne colle plus en haut, elle mangerait l'écran */
  @media (max-width: 640px) {
    .col-tools {
      position: static;
    }

    .col-seg {
      width: 100%;
    }

    .col-seg button {
      flex: 1;
    }

    .col-selects label {
      flex: 1 1 140px;
    }

    .col-selects select {
      width: 100%;
    }
  }

  .col-rar:focus-visible,
  .col-seg button:focus-visible,
  .col-group:focus-visible,
  .col-more:focus-visible,
  .col-btn:focus-visible,
  .col-back:focus-visible,
  .col-selects select:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
