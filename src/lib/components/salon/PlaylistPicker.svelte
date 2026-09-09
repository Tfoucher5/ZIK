<script>
  let { playlists = [], selectedIds = $bindable([]) } = $props();

  let searchQuery = $state('');

  let filteredPlaylists = $derived(
    searchQuery.trim()
      ? playlists.filter(p => p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
      : playlists
  );

  let selectedPlaylists = $derived(playlists.filter(p => selectedIds.includes(p.id)));
  let totalTrackCount   = $derived(selectedPlaylists.reduce((s, p) => s + (p.trackCount || 0), 0));

  function togglePlaylist(pl) {
    selectedIds = selectedIds.includes(pl.id)
      ? selectedIds.filter(id => id !== pl.id)
      : [...selectedIds, pl.id];
  }
</script>

{#if playlists.length === 0}
  <p style="font-size:.85rem;color:var(--mid)">
    Aucune playlist disponible.
    <a href="/playlists" style="color:var(--accent2)">Crée-en une →</a>
  </p>
{:else}
  {#if selectedPlaylists.length > 0}
    <div class="salon-playlist-chips">
      {#each selectedPlaylists as pl (pl.id)}
        <div class="salon-playlist-chip">
          <span>{pl.emoji} {pl.name}</span>
          <button class="salon-chip-remove" onclick={() => togglePlaylist(pl)} aria-label="Retirer {pl.name}">×</button>
        </div>
      {/each}
    </div>
    <div class="salon-playlist-total">
      {totalTrackCount} titre{totalTrackCount !== 1 ? 's' : ''} au total
    </div>
  {/if}

  <input
    class="salon-playlist-search"
    type="search"
    placeholder="Rechercher une playlist…"
    bind:value={searchQuery}
    autocomplete="off"
  >

  <div class="salon-playlist-list">
    {#if filteredPlaylists.length === 0}
      <p style="font-size:.82rem;color:var(--dim);padding:8px 4px">Aucun résultat.</p>
    {:else}
      {#each filteredPlaylists as pl (pl.id)}
        {@const isSelected = selectedIds.includes(pl.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div
          class="salon-playlist-item {isSelected ? 'selected' : ''}"
          onclick={() => togglePlaylist(pl)}
          role="option"
          aria-selected={isSelected}
        >
          <span class="salon-playlist-emoji">{pl.emoji}</span>
          <div class="salon-playlist-info">
            <div class="salon-playlist-name">{pl.name}</div>
            <div class="salon-playlist-meta">{pl.group}</div>
          </div>
          {#if pl.trackCount}
            <span class="salon-playlist-count">{pl.trackCount} titres</span>
          {/if}
          <span class="salon-playlist-check"></span>
        </div>
      {/each}
    {/if}
  </div>
{/if}
