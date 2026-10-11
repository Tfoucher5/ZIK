<script>
  import { FILTERS, SORTS, toggleFilter } from '$lib/rooms/filter.js';

  let { q = $bindable(), active = $bindable(), sort = $bindable(), counts } = $props();
</script>

<div class="rf">
  <div class="rf-top">
    <div class="rf-search">
      <span aria-hidden="true">⌕</span>
      <input type="search" bind:value={q} placeholder="Rechercher une room, un créateur, une playlist..." aria-label="Rechercher une room">
    </div>
    <label class="rf-sort">
      <span>Trier</span>
      <select bind:value={sort}>
        {#each Object.entries(SORTS) as [k, label] (k)}<option value={k}>{label}</option>{/each}
      </select>
    </label>
  </div>
  <div class="rf-chips" role="group" aria-label="Filtres">
    {#each Object.entries(FILTERS) as [k, f] (k)}
      <button class="rf-chip" class:on={active.includes(k)} aria-pressed={active.includes(k)}
        disabled={!counts[k] && !active.includes(k)} onclick={() => active = toggleFilter(active, k)}>
        {f.label} <span class="rf-n">{counts[k]}</span>
      </button>
    {/each}
    {#if active.length}<button class="rf-reset" onclick={() => active = []}>✕ Effacer</button>{/if}
  </div>
</div>

<style>
  .rf { display: flex; flex-direction: column; gap: 10px; margin: 0 0 18px; }
  .rf-top { display: flex; gap: 10px; align-items: center; }
  .rf-search {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 0 14px;
    border: 1px solid var(--border2);
    border-radius: 12px;
    background: rgb(var(--c-glass) / 0.04);
    color: var(--dim);
  }
  .rf-search:focus-within { border-color: rgb(var(--accent-rgb) / 0.55); }
  .rf-search input { flex: 1; min-width: 0; height: 44px; border: none; background: none; color: var(--text); font: inherit; font-size: 0.9rem; outline: none; }
  .rf-sort { display: flex; align-items: center; gap: 8px; font-size: 0.7rem; color: var(--dim); text-transform: uppercase; letter-spacing: 0.1em; }
  .rf-sort select {
    height: 44px;
    padding: 0 10px;
    border: 1px solid var(--border2);
    border-radius: 12px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: 0.82rem;
    text-transform: none;
    letter-spacing: 0;
  }
  /* Les options suivent le thème : sinon texte clair sur fond système blanc */
  .rf-sort option { background-color: var(--bg2); color: var(--text); }
  .rf-chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .rf-chip, .rf-reset {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 34px;
    padding: 0 12px;
    border: 1px solid var(--border2);
    border-radius: 999px;
    background: none;
    color: var(--mid);
    font: inherit;
    font-size: 0.78rem;
    cursor: pointer;
    transition: border-color 0.12s, color 0.12s, background 0.12s;
  }
  .rf-chip:hover:not(:disabled) { border-color: var(--text); color: var(--text); }
  .rf-chip.on { border-color: var(--accent); background: rgb(var(--accent-rgb) / 0.12); color: var(--accent); }
  .rf-chip:disabled { opacity: 0.4; cursor: default; }
  .rf-n { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 0.68rem; opacity: 0.75; }
  .rf-reset { border-style: dashed; }
  @media (max-width: 600px) {
    .rf-sort span { display: none; }
    .rf-chips { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; margin: 0 -16px; padding: 0 16px; }
    .rf-chip, .rf-reset { flex: 0 0 auto; }
  }
</style>
