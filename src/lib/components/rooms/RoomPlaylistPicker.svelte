<script>
  import { fuzzyFilter } from '$lib/shared/fuzzy.js';

  let { playlists, selected = $bindable() } = $props();

  let q = $state('');

  const chosen = $derived(selected.map((id) => playlists.find((p) => p.id === id)).filter(Boolean));
  const total = $derived(chosen.reduce((n, p) => n + (p.track_count || 0), 0));
  const GROUPS = ['Mes playlists', 'Officielles', 'Publiques'];
  const groups = $derived.by(() => {
    const list = fuzzyFilter(playlists, q, ['name']);
    return GROUPS.map((g) => ({ name: g, items: list.filter((p) => p.group === g) })).filter((g) => g.items.length);
  });

  function toggle(id) {
    selected = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
  }
</script>

<div class="pp">
  <div class="pp-head">
    <span class="pp-label">Playlists</span>
    {#if chosen.length}<span class="pp-total">{chosen.length} · {total} titres</span>{/if}
  </div>

  {#if chosen.length}
    <div class="pp-chosen">
      {#each chosen as p (p.id)}
        <span class="pp-chip">{p.name}<button onclick={() => toggle(p.id)} aria-label="Retirer {p.name}">✕</button></span>
      {/each}
    </div>
  {/if}

  <input type="search" class="pp-search" bind:value={q} placeholder="Rechercher une playlist..." aria-label="Rechercher une playlist">

  <ul class="pp-list">
    {#each groups as g (g.name)}
      <li class="pp-group">{g.name} <span>{g.items.length}</span></li>
      {#each g.items as p (p.id)}
        {@const on = selected.includes(p.id)}
        <li>
          <button class="pp-row" class:on onclick={() => toggle(p.id)} aria-pressed={on}>
            <span class="pp-ck" aria-hidden="true">{on ? '✓' : ''}</span>
            <span class="pp-name">{p.name}</span>
            <span class="pp-n">{p.track_count ?? 0}</span>
          </button>
        </li>
      {/each}
    {:else}
      <li class="pp-empty">Aucune playlist trouvée.</li>
    {/each}
  </ul>
  <p class="pp-note">3 titres minimum. <a href="/playlists">Gérer mes playlists</a></p>
</div>

<style>
  .pp { display: flex; flex-direction: column; gap: 8px; min-height: 0; }
  .pp-head { display: flex; justify-content: space-between; align-items: baseline; }
  .pp-label { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); }
  .pp-total { font-size: 0.74rem; font-weight: 700; color: var(--accent); }
  .pp-chosen { display: flex; flex-wrap: wrap; gap: 5px; }
  .pp-chip {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 2px 2px 2px 10px;
    border-radius: 999px;
    background: rgb(var(--accent-rgb) / 0.14);
    font-size: 0.78rem;
  }
  .pp-chip button { width: 24px; height: 24px; border: none; border-radius: 50%; background: none; color: var(--dim); cursor: pointer; }
  .pp-chip button:hover { color: var(--danger); }
  .pp-search {
    height: 40px;
    padding: 0 12px;
    border: 1px solid var(--border2);
    border-radius: 9px;
    background: rgb(var(--c-glass) / 0.04);
    color: var(--text);
    font: inherit;
    font-size: 0.85rem;
    outline: none;
  }
  .pp-search:focus { border-color: rgb(var(--accent-rgb) / 0.5); }
  .pp-list { list-style: none; margin: 0; padding: 0; flex: 1; min-height: 160px; max-height: 340px; overflow-y: auto; border: 1px solid var(--border); border-radius: 10px; scrollbar-width: thin; }
  .pp-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 42px;
    padding: 6px 12px;
    border: none;
    border-bottom: 1px solid var(--border);
    background: none;
    color: var(--text);
    font: inherit;
    font-size: 0.84rem;
    text-align: left;
    cursor: pointer;
  }
  .pp-row:hover { background: var(--surface2); }
  .pp-row.on { background: rgb(var(--accent-rgb) / 0.08); }
  .pp-ck {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border2);
    border-radius: 5px;
    font-size: 0.7rem;
    color: var(--on-accent);
  }
  .pp-row.on .pp-ck { background: var(--accent); border-color: var(--accent); }
  .pp-name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pp-group {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 6px 12px;
    background: var(--modal-bg);
    border-bottom: 1px solid var(--border);
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .pp-group span { color: var(--dim); }
  .pp-n { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 0.7rem; color: var(--dim); }
  .pp-empty { padding: 14px; font-size: 0.8rem; color: var(--dim); }
  .pp-note { margin: 0; font-size: 0.7rem; color: var(--dim); }
  .pp-note a { color: var(--accent); }
</style>
