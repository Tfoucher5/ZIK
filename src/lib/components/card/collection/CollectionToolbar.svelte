<script>
  import { VIEWS, GROUP_SORTS, STATES, SORTS, decadeLabel } from './collection.js';

  let { q, view, sort, groupSort, setState, genre, decade, genres, decades, setParam } = $props();
</script>

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

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
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

  .col-seg button:focus-visible,
  .col-selects select:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
