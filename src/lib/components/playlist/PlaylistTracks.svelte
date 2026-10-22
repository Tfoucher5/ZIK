<script>
  import PlaylistTrackRow from './PlaylistTrackRow.svelte';
  import { fuzzyFilter } from '$lib/shared/fuzzy.js';

  let { store, onEditAnswers } = $props();

  let filter = $state('');
  let openId = $state(null);

  const shown = $derived(fuzzyFilter(store.tracks, filter, ['artist', 'title']));

  let shownPl = null;
  $effect(() => {
    const id = store.current?.id;
    if (id === shownPl) return;
    shownPl = id;
    openId = null;
    filter = '';
  });
</script>

<section class="ptracks" aria-label="Titres de la playlist">
  {#if store.tracks.length > 6}
    <input type="search" class="ptracks-filter" bind:value={filter} placeholder="Filtrer les {store.tracks.length} titres..." aria-label="Filtrer les titres">
  {/if}

  {#if store.tracksLoading}
    <p class="ptracks-none">Chargement des titres...</p>
  {:else if !store.tracks.length}
    <div class="ptracks-empty">
      <p class="ptracks-empty-title">Playlist vide</p>
      <p>Tape un titre dans la barre d'ajout, ou colle une liste ou un lien de playlist Deezer.</p>
    </div>
  {:else if !shown.length}
    <p class="ptracks-none">Aucun titre ne correspond à « {filter} ».</p>
  {:else}
    <ol class="ptracks-list">
      {#each shown as t (t.id)}
        <PlaylistTrackRow track={t} index={store.tracks.indexOf(t) + 1} {store}
          open={openId === t.id}
          onToggle={() => openId = openId === t.id ? null : t.id}
          onEditAnswers={() => onEditAnswers(t)} />
      {/each}
    </ol>
  {/if}
</section>

<style>
  .ptracks { display: flex; flex-direction: column; min-height: 0; }
  .ptracks-filter {
    margin: 0 0 6px;
    background: rgb(var(--c-glass) / 0.04);
    border: 1px solid var(--border2);
    color: var(--text);
    border-radius: 8px;
    padding: 8px 12px;
    font: inherit;
    font-size: 0.82rem;
    outline: none;
  }
  .ptracks-filter:focus { border-color: rgb(var(--accent-rgb) / 0.4); }
  .ptracks-list { list-style: none; margin: 0; padding: 0; }
  .ptracks-empty { padding: 48px 12px; text-align: center; color: var(--mid); font-size: 0.82rem; }
  .ptracks-empty-title {
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 900;
    font-size: 1.1rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text);
    margin-bottom: 6px;
  }
  .ptracks-none { padding: 24px 0; color: var(--dim); font-size: 0.82rem; }
</style>
