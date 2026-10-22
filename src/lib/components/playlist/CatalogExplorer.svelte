<script>
  import TrackResult from './TrackResult.svelte';
  import { toast } from '$lib/client/toast.svelte.js';

  let { target, store, onBack, onNavigate } = $props();

  let data = $state(null);
  let error = $state('');
  let adding = $state(false);

  const missing = $derived(data ? data.tracks.filter((t) => !store.find(t)) : []);
  const head = $derived(data?.artist ?? data?.album);

  $effect(() => {
    const { type, id } = target;
    data = null;
    error = '';
    const ctrl = new AbortController();
    fetch(`/api/deezer/${type}/${id}`, { signal: ctrl.signal })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || body.message || `HTTP ${r.status}`);
        data = body;
      })
      .catch((e) => { if (e.name !== 'AbortError') error = e.message; });
    return () => ctrl.abort();
  });

  async function addAll() {
    adding = true;
    const n = await store.addBatch(missing);
    adding = false;
    if (n) toast(`${n} titre${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''}`, 'success');
  }
</script>

<div class="cx">
  <button class="cx-back" onclick={onBack}>‹ Retour</button>

  {#if error}
    <p class="cx-msg err">{error}</p>
  {:else if !data}
    <p class="cx-msg">Chargement...</p>
  {:else}
    <header class="cx-head">
      <img class="cx-pic" class:round={target.type === 'artist'} src={head.picture ?? head.cover} alt="" width="64" height="64">
      <div class="cx-head-txt">
        <span class="cx-kicker">{target.type === 'artist' ? 'Artiste · titres phares' : `Album${head.year ? ` · ${head.year}` : ''}`}</span>
        <h3 class="cx-name">{head.name ?? head.title}</h3>
        {#if data.album?.artist_id}
          <button class="cx-sub" onclick={() => onNavigate({ type: 'artist', id: data.album.artist_id })}>{data.album.artist} ›</button>
        {/if}
      </div>
      <button class="btn-accent sm cx-all" onclick={addAll} disabled={adding || !missing.length}>
        {adding ? '...' : missing.length ? `Tout ajouter (${missing.length})` : 'Tout est ajouté'}
      </button>
    </header>

    <div class="cx-list">
      {#each data.tracks as t (t.external_id)}
        <TrackResult track={t} {store} onAlbum={target.type === 'artist' ? (id) => onNavigate({ type: 'album', id }) : null} />
      {/each}
    </div>

    {#if data.albums?.length}
      <h4 class="cx-sec">Albums et singles</h4>
      <div class="cx-albums">
        {#each data.albums as a (a.id)}
          <button class="cx-album" onclick={() => onNavigate({ type: 'album', id: a.id })}>
            <img src={a.cover} alt="" width="96" height="96" loading="lazy" decoding="async">
            <span class="cx-album-title" title={a.title}>{a.title}</span>
            <span class="cx-album-year">{a.year}{a.type !== 'album' ? ` · ${a.type}` : ''}</span>
          </button>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .cx { display: flex; flex-direction: column; gap: 8px; }
  .cx-back {
    align-self: flex-start;
    border: none;
    background: none;
    padding: 6px 8px;
    color: var(--mid);
    font: inherit;
    font-size: 0.78rem;
    cursor: pointer;
  }
  .cx-back:hover { color: var(--text); }
  .cx-msg { padding: 16px 8px; font-size: 0.8rem; color: var(--mid); }
  .cx-msg.err { color: var(--danger); }
  .cx-head { display: flex; align-items: center; gap: 12px; padding: 0 8px 8px; flex-wrap: wrap; }
  .cx-pic { width: 64px; height: 64px; border-radius: 6px; object-fit: cover; background: var(--surface); }
  .cx-pic.round { border-radius: 50%; }
  .cx-head-txt { flex: 1; min-width: 140px; }
  .cx-kicker { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); }
  .cx-name {
    margin: 2px 0 0;
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 900;
    font-size: 1.35rem;
    line-height: 1.05;
    text-transform: uppercase;
  }
  .cx-sub { border: none; background: none; padding: 2px 0; color: var(--mid); font: inherit; font-size: 0.78rem; cursor: pointer; }
  .cx-sub:hover { color: var(--accent); }
  .cx-all { min-height: 38px; }
  .cx-list { display: flex; flex-direction: column; }
  .cx-sec {
    margin: 14px 8px 4px;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--dim);
  }
  .cx-albums {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 104px;
    gap: 10px;
    overflow-x: auto;
    padding: 4px 8px 10px;
    scrollbar-width: thin;
  }
  .cx-album {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0;
    border: none;
    background: none;
    color: var(--text);
    text-align: left;
    cursor: pointer;
  }
  .cx-album img { width: 104px; height: 104px; border-radius: 6px; object-fit: cover; background: var(--surface); transition: transform 0.12s; }
  .cx-album:hover img { transform: translateY(-2px); }
  .cx-album-title { font-size: 0.74rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cx-album-year { font-size: 0.66rem; color: var(--dim); }
</style>
