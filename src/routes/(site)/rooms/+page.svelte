<script>
  import JsonLd from '$lib/components/JsonLd.svelte';
  import { onMount, getContext } from 'svelte';
  import { page } from '$app/state';
  import Toast from '$lib/components/Toast.svelte';
  import LoadMore from '$lib/components/LoadMore.svelte';
  import GuestModal from '$lib/components/GuestModal.svelte';
  import RoomTile from '$lib/components/rooms/RoomTile.svelte';
  import RoomFilters from '$lib/components/rooms/RoomFilters.svelte';
  import LiveStrip from '$lib/components/rooms/LiveStrip.svelte';
  import RoomFormModal from '$lib/components/rooms/RoomFormModal.svelte';
  import { RoomsStore } from '$lib/components/rooms/roomsStore.svelte.js';
  import { filterRooms, countByFilter, sortRooms } from '$lib/rooms/filter.js';
  import { toast } from '$lib/toast.svelte.js';
  import { breadcrumb } from '$lib/seo.js';

  const breadcrumbJsonLd = breadcrumb([{ name: 'Rooms', path: '/rooms' }]);
  const roomsJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Rooms de Blind Test Multijoueur — ZIK",
    "description": "Parcourez les rooms de blind test multijoueur ZIK. Mode Classique avec classement ELO ou Mode QCM. Créez votre propre room en 30 secondes.",
    "url": "https://www.zik-music.fr/rooms",
    "inLanguage": "fr-FR",
    "isPartOf": { "@type": "WebSite", "url": "https://www.zik-music.fr/", "name": "ZIK" }
  });

  const PAGE = 24;
  const _ctx = getContext('zik');
  const user = $derived(_ctx.user);
  const store = new RoomsStore(_ctx.sb, () => _ctx.user);

  let tab = $state('public');
  let q = $state('');
  // /rooms?cartes : arrivée depuis le défi « cartes gagnées »
  let active = $state(page.url.searchParams.has('cartes') ? ['cards'] : []);
  let sort = $state('activity');
  let visible = $state(PAGE);

  const counts = $derived(countByFilter(store.publicRooms, q));
  const results = $derived(sortRooms(filterRooms(store.publicRooms, { q, active }), sort));
  const shown = $derived(results.slice(0, visible));

  let formOpen = $state(false);
  let editing = $state(null);
  let guestOpen = $state(false);
  let pendingJoin = null;

  onMount(() => { store.loadPublic(); });

  $effect(() => { q; active; sort; visible = PAGE; });
  $effect(() => { if (shown.length) store.fillCovers(shown); });
  $effect(() => { if (tab === 'mine' && user && !store.mineLoaded) store.loadMine(); });
  $effect(() => { if (store.myRooms.length) store.fillCovers(store.myRooms); });

  function goToGame(code, gameMode, username, userId) {
    const p = new URLSearchParams({ roomId: code, username, userId, isGuest: userId ? '0' : '1', gameMode });
    window.location.href = `/game?${p}`;
  }

  function join(r) {
    if (!user) { pendingJoin = r; guestOpen = true; return; }
    goToGame(r.code, r.game_mode, user.profile?.username || user.email?.split('@')[0] || 'Joueur', user.id);
  }

  function openForm(room = null) {
    if (!user) { _ctx.openAuthModal('login'); return; }
    editing = room && { id: room.id, code: room.code };
    formOpen = true;
  }

  async function remove(r) {
    if (!confirm(`Supprimer la room « ${r.name} » ? Cette action est irréversible.`)) return;
    try {
      await store.remove(r.id);
      toast('Room supprimée.', 'success');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  }
</script>

<svelte:head>
  <title>Rooms de Blind Test Multijoueur en Ligne - ZIK</title>
  <meta name="description" content="Rejoins une room de blind test multijoueur gratuit ou crée la tienne. Mode Classique avec classement ELO ou Mode QCM, playlists Deezer. Jusqu'à 20 joueurs en temps réel." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/rooms" />
  <meta property="og:title" content="Rooms de Blind Test Multijoueur - ZIK" />
  <meta property="og:description" content="Rejoins une room de blind test en ligne ou crée la tienne. Mode Classique ELO ou QCM casual. Playlists Deezer. Gratuit, sans inscription." />
  <meta property="og:url" content="https://www.zik-music.fr/rooms" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png?v=3.12.0" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Rooms de Blind Test Multijoueur - ZIK" />
  <meta name="twitter:description" content="Rejoins ou crée une room de blind test en ligne. Mode Classique ELO ou QCM. Gratuit, sans inscription." />
  <meta name="twitter:image" content="https://www.zik-music.fr/og.png?v=3.12.0" />
  <JsonLd json={roomsJsonLd} />
  <JsonLd json={breadcrumbJsonLd} />
</svelte:head>

<div class="rooms">
  <header class="rooms-head">
    <div>
      <h1>Rooms</h1>
      <p>Rejoins une partie en ligne, ou crée ta room avec tes playlists.</p>
    </div>
    <button class="btn-accent rooms-create" onclick={() => openForm()}>+ Créer une room</button>
  </header>

  {#if user}
    <div class="rooms-tabs" role="tablist">
      <button role="tab" aria-selected={tab === 'public'} class:on={tab === 'public'} onclick={() => tab = 'public'}>
        Rooms publiques {#if !store.pubLoading}<span>{store.publicRooms.length}</span>{/if}
      </button>
      <button role="tab" aria-selected={tab === 'mine'} class:on={tab === 'mine'} onclick={() => tab = 'mine'}>
        Mes rooms {#if store.mineLoaded}<span>{store.myRooms.length}</span>{/if}
      </button>
    </div>
  {/if}

  {#if tab === 'public'}
    {#if store.pubLoading}
      <p class="rooms-msg">Chargement des rooms...</p>
    {:else if !store.publicRooms.length}
      <div class="rooms-empty">
        <p>Aucune room publique pour l'instant. Sois le premier à en créer une !</p>
        <button class="btn-accent" onclick={() => openForm()}>Créer une room</button>
      </div>
    {:else}
      <LiveStrip rooms={store.publicRooms} {store} onJoin={join} />
      <RoomFilters bind:q bind:active bind:sort {counts} />

      {#if !results.length}
        <p class="rooms-msg">Aucune room ne correspond. <button class="rooms-link" onclick={() => { q = ''; active = []; }}>Tout afficher</button></p>
      {:else}
        <div class="rooms-grid">
          {#each shown as r, i (r.id)}
            <RoomTile room={r} covers={store.covers(r)} seed={i} onJoin={() => join(r)} />
          {/each}
        </div>
        {#if visible < results.length}
          <LoadMore hasMore={true} onLoad={() => visible += PAGE} />
        {:else}
          <p class="rooms-end">{results.length} room{results.length > 1 ? 's' : ''}</p>
        {/if}
      {/if}
    {/if}
  {:else if store.mineLoading && !store.mineLoaded}
    <p class="rooms-msg">Chargement de tes rooms...</p>
  {:else}
    <div class="rooms-grid">
      <button class="rooms-new" onclick={() => openForm()}>
        <span class="rooms-new-plus">+</span>
        <strong>Nouvelle room</strong>
        <span>Choisis tes playlists, le mode et les réglages</span>
      </button>
      {#each store.myRooms as r, i (r.id)}
        <RoomTile room={r} covers={store.covers(r)} seed={i} owner
          onJoin={() => join(r)} onEdit={() => openForm(r)} onDelete={() => remove(r)} />
      {/each}
    </div>
  {/if}
</div>

<RoomFormModal open={formOpen} {editing} {store} onClose={() => formOpen = false}
  onJoin={(r) => { formOpen = false; join(r); }} />

<Toast />

<GuestModal
  open={guestOpen}
  onClose={() => guestOpen = false}
  onConfirm={(name) => { guestOpen = false; goToGame(pendingJoin.code, pendingJoin.game_mode, name, ''); }}
/>

<style>
  .rooms {
    width: 100%;
    box-sizing: border-box;
    max-width: 1840px;
    margin: 0 auto;
    padding: calc(var(--nav-h) + 28px) clamp(16px, 4vw, 72px) 56px;
  }
  .rooms-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
  .rooms-head h1 {
    margin: 0;
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 900;
    font-size: clamp(2.4rem, 5vw, 3.6rem);
    line-height: 1;
    letter-spacing: -1px;
    text-transform: uppercase;
  }
  .rooms-head p { margin: 6px 0 0; color: var(--mid); font-size: 0.9rem; }
  .rooms-create { flex-shrink: 0; }

  .rooms-tabs { display: flex; gap: 4px; margin: 0 0 20px; border-bottom: 1px solid var(--border); }
  .rooms-tabs button {
    padding: 10px 14px;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    background: none;
    color: var(--mid);
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 800;
    font-size: 0.9rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .rooms-tabs button.on { color: var(--text); border-bottom-color: var(--accent); }
  .rooms-tabs span { margin-left: 4px; font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 0.7rem; color: var(--dim); }

  .rooms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
  .rooms-msg, .rooms-end { padding: 28px 0; text-align: center; color: var(--dim); font-size: 0.85rem; }
  .rooms-link { border: none; background: none; color: var(--accent); font: inherit; cursor: pointer; text-decoration: underline; }
  .rooms-empty { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 60px 16px; color: var(--mid); text-align: center; }
  .rooms-new {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 220px;
    padding: 20px;
    border: 2px dashed var(--border2);
    border-radius: 14px;
    background: none;
    color: var(--mid);
    text-align: center;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .rooms-new:hover { border-color: var(--accent); color: var(--accent); }
  .rooms-new-plus { font-size: 2.4rem; line-height: 1; font-weight: 300; }
  .rooms-new strong { font-family: "Barlow Condensed", sans-serif; font-size: 1.2rem; text-transform: uppercase; color: var(--text); }
  .rooms-new span:last-child { font-size: 0.76rem; }

  @media (max-width: 600px) {
    .rooms { padding-top: calc(var(--nav-h) + 18px); padding-bottom: 96px; }
    .rooms-head { flex-direction: column; align-items: stretch; }
    .rooms-create { width: 100%; }
    .rooms-grid { grid-template-columns: 1fr; gap: 10px; }
    .rooms-new { min-height: 0; flex-direction: row; justify-content: flex-start; padding: 14px 16px; }
    .rooms-new span:last-child { display: none; }
  }
</style>
