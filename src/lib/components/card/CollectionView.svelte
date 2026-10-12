<script>
  import { getContext, untrack } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import CardViewer from './CardViewer.svelte';
  import { STEP, autoMore, decadeOf, filterCards, groupCards } from './collection/collection.js';
  import { CollectionStore } from './collection/collectionStore.svelte.js';
  import CollectionHeader from './collection/CollectionHeader.svelte';
  import CollectionToolbar from './collection/CollectionToolbar.svelte';
  import CollectionGrid from './collection/CollectionGrid.svelte';
  import CollectionGroups from './collection/CollectionGroups.svelte';
  import CollectionSetHead from './collection/CollectionSetHead.svelte';

  /** Collection d'un joueur : la sienne (/collection) ou celle d'un autre. */
  let { username } = $props();

  const _ctx = getContext('zik');
  const store = new CollectionStore(_ctx.sb);

  let shown = $state(STEP);

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

  $effect(() => {
    const name = username;
    store.status = 'loading';
    store.load(name);
  });

  $effect(() => {
    const id = setId;
    untrack(() => store.loadSet(id, username));
  });

  const cards = $derived(store.data?.cards ?? []);
  const genres = $derived([...new Set(cards.map((c) => c.genre).filter(Boolean))].sort());
  const decades = $derived([...new Set(cards.map((c) => decadeOf(c.year)).filter(Boolean))].sort());
  const filtered = $derived(filterCards(cards, { q, rarity, genre, decade, sort }));
  const groups = $derived(
    view === 'toutes' ? [] : groupCards(filtered, store.data?.sets ?? [], { view, groupSort, setState }),
  );
  const hasFilters = $derived(!!(q || rarity || genre || decade || (view !== 'toutes' && setState)));
</script>

<CardViewer />

<div class="col">
  {#if store.status === 'loading'}
    <p class="col-msg" role="status">Chargement de la collection…</p>
  {:else if store.status === 'login'}
    <div class="col-empty">
      <p class="col-empty-title">Connecte-toi pour voir les collections</p>
      <p>Les cartes se gagnent en jouant avec un compte.</p>
      <button type="button" class="col-btn" onclick={() => _ctx.openAuthModal?.('login')}>Se connecter</button>
    </div>
  {:else if store.status === 'private'}
    <div class="col-empty">
      <p class="col-empty-title">Collection privée</p>
      <p>{username} a choisi de garder son profil privé.</p>
    </div>
  {:else if store.status === 'error'}
    <div class="col-empty">
      <p class="col-empty-title">La collection n'a pas pu être chargée</p>
      <button type="button" class="col-btn" onclick={() => store.load(username)}>Réessayer</button>
    </div>
  {:else if setId}
    <!-- Détail d'un set : possédées en clair, manquantes en silhouette -->
    <section class="col-set" aria-labelledby="set-title">
      <button type="button" class="col-back" onclick={() => setParam({ set: '' })}>
        ← {view === 'albums' ? 'Albums' : 'Artistes'}
      </button>
      {#if store.setLoading}
        <p class="col-msg" role="status">Chargement du set…</p>
      {:else if store.setDetail}
        {@const ownedCards = store.setDetail.cards.filter((c) => c.owned)}
        <CollectionSetHead detail={store.setDetail} owned={ownedCards.length} />
        <CollectionGrid set cards={store.setDetail.cards} list={ownedCards} />
      {:else}
        <p class="col-msg">Ce set est introuvable.</p>
      {/if}
    </section>
  {:else}
    {@const data = store.data}
    <CollectionHeader {data} {cards} {rarity} {setParam} />

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
      <CollectionToolbar {q} {view} {sort} {groupSort} {setState} {genre} {decade} {genres} {decades} {setParam} />

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
          <CollectionGrid cards={filtered.slice(0, shown)} list={filtered} />
          {#if filtered.length > shown}
            <button type="button" class="col-more" use:autoMore onclick={() => (shown += STEP)}>
              Afficher {Math.min(STEP, filtered.length - shown)} cartes de plus
            </button>
          {/if}
        {:else}
          <p class="col-msg">Aucune carte ne correspond à ces filtres.</p>
        {/if}
      {:else}
        <CollectionGroups groups={groups.slice(0, shown)} onopen={(id) => setParam({ set: id })} />
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

  .col-more:focus-visible,
  .col-btn:focus-visible,
  .col-back:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
