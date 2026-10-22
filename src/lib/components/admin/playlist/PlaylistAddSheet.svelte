<script>
  import { enhance } from '$app/forms';
  import Sheet from '$lib/components/admin/Sheet.svelte';

  /** Ajout d'un titre du catalogue à la playlist, avec recherche au fil de la frappe. */
  let { open = $bindable(), inPlaylist, keep } = $props();

  let found = $state([]);
  let searching = $state(false);
  let added = $state([]);
  let searchTimer;

  function onSearch(e) {
    clearTimeout(searchTimer);
    const v = e.currentTarget.value.trim();
    if (v.length < 2) {
      found = [];
      return;
    }
    searchTimer = setTimeout(async () => {
      searching = true;
      try {
        const r = await fetch(`/api/tracks/search?q=${encodeURIComponent(v)}`);
        found = r.ok ? await r.json() : [];
      } finally {
        searching = false;
      }
    }, 300);
  }
  $effect(() => () => clearTimeout(searchTimer));
</script>

<Sheet bind:open title="Ajouter un titre">
  <div class="add">
    <label class="a-search">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <span class="a-sr">Chercher dans le catalogue</span>
      <input type="search" placeholder="Artiste ou titre…" oninput={onSearch} />
    </label>
    {#if searching}<p class="a-muted">Recherche…</p>{/if}
    <ul class="a-list">
      {#each found as r (r.id)}
        <li class="a-row">
          {#if r.cover_url}<img class="a-cover" src={r.cover_url} alt="" loading="lazy" />{:else}<span class="a-cover"></span>{/if}
          <span class="a-row-main">
            <span class="a-row-title">{r.title}</span>
            <span class="a-row-sub">{r.artist}</span>
          </span>
          {#if inPlaylist.has(r.id) || added.includes(r.id)}
            <em class="a-tag good">dans la playlist</em>
          {:else}
            <form method="POST" action="?/addTrack" use:enhance={() => { added = [...added, r.id]; return keep(); }}>
              <input type="hidden" name="track_id" value={r.id} />
              <button class="a-btn small primary">Ajouter</button>
            </form>
          {/if}
        </li>
      {/each}
    </ul>
    <p class="a-muted small">Seuls les titres déjà dans le catalogue apparaissent ici.</p>
  </div>
</Sheet>

<style>
  .add { display: grid; gap: 12px; }
  .add form { display: contents; }
  .small { font-size: 0.78rem; font-weight: 400; }
</style>
