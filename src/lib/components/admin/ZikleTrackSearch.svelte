<script>
  // À placer dans un <form> : chaque résultat est un bouton qui envoie track_id.
  let { disabled = false } = $props();

  let q = $state('');
  let results = $state([]);
  let loading = $state(false);
  let searched = $state(false);

  $effect(() => {
    const term = q.trim();
    if (term.length < 2) {
      results = [];
      searched = false;
      return;
    }
    const id = setTimeout(async () => {
      loading = true;
      try {
        const r = await fetch(`/api/tracks/search?q=${encodeURIComponent(term)}`);
        const json = r.ok ? await r.json() : [];
        results = Array.isArray(json) ? json : [];
      } finally {
        loading = false;
        searched = true;
      }
    }, 250);
    return () => clearTimeout(id);
  });
</script>

<label class="a-search">
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
  <span class="a-sr">Rechercher un titre</span>
  <!-- svelte-ignore a11y_autofocus -->
  <input type="search" placeholder="Artiste ou titre…" bind:value={q} autofocus />
</label>

{#if loading}
  <p class="a-muted hint">Recherche…</p>
{:else if searched && !results.length}
  <p class="a-muted hint">Aucun titre trouvé.</p>
{/if}

{#if results.length}
  <ul class="a-list res">
    {#each results as t (t.id)}
      <li>
        <button class="a-row" type="submit" name="track_id" value={t.id} {disabled}>
          {#if t.cover_url}<img class="a-cover" src={t.cover_url} alt="" />{:else}<span class="a-cover"></span>{/if}
          <span class="a-row-main">
            <span class="a-row-title">{t.title}</span>
            <span class="a-row-sub">{t.artist}</span>
          </span>
        </button>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .hint { margin-top: 10px; font-size: 0.85rem; }
  .res { margin-top: 10px; }
  span.a-cover { display: inline-block; }
</style>
