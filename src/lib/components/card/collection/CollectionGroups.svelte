<script>
  import { photoFallback } from './collection.js';
  import CollectionProgress from './CollectionProgress.svelte';

  /** Sets d'artistes ou d'albums ; onopen(setId) ouvre le détail d'un set. */
  let { groups, onopen } = $props();
</script>

<ul class="col-groups">
  {#each groups as g (g.key)}
    <li>
      <button
        type="button"
        class="col-group"
        class:is-done={g.set?.completedAt}
        disabled={!g.set}
        onclick={() => onopen(g.set.id)}
      >
        {#if g.set?.completedAt}<span class="col-done-badge">✓ Set complet</span>{/if}
        {#if g.photo}
          <img src={g.photo} alt="" loading="lazy" class="is-artist" onerror={(e) => photoFallback(e, g.cover)} />
        {:else}
          <img src={g.cover} alt="" loading="lazy" />
        {/if}
        <span class="col-group-name">{g.name}</span>
        {#if g.set}
          <CollectionProgress width={`${(g.set.owned / g.set.total) * 100}%`} />
          <span class="col-group-count">
            {g.set.completedAt ? `${g.set.total} / ${g.set.total} cartes` : `${g.set.owned} / ${g.set.total} cartes`}
          </span>
        {:else}
          <span class="col-group-count">{g.cards.length} carte{g.cards.length > 1 ? 's' : ''}</span>
        {/if}
      </button>
    </li>
  {/each}
</ul>

<style>
  .col-groups {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 14px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .col-group {
    display: grid;
    gap: 8px;
    width: 100%;
    padding: 10px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .col-group:disabled {
    cursor: default;
  }

  .col-group:not(:disabled):hover {
    border-color: var(--border2);
  }

  .col-group {
    position: relative;
  }

  /* Set terminé : doré, il doit se repérer d'un coup d'œil */
  .col-group.is-done {
    border: 2px solid var(--rarity-legendary);
    background: linear-gradient(160deg, color-mix(in oklab, var(--rarity-legendary) 22%, var(--surface)), var(--surface) 70%);
    box-shadow: 0 8px 26px color-mix(in oklab, var(--rarity-legendary) 30%, transparent);
  }

  .col-group.is-done .col-group-count {
    color: var(--text);
    font-weight: 700;
  }

  .col-done-badge {
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 1;
    padding: 5px 10px;
    border-radius: 99px;
    background: var(--rarity-legendary);
    color: #1a1204;
    font: 700 0.78rem/1 'Barlow', sans-serif;
    box-shadow: 0 4px 12px rgb(0 0 0 / 0.25);
  }

  .col-group img {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 8px;
    object-fit: cover;
  }

  /* Photo d'artiste ronde, comme sur les plateformes de streaming */
  .col-group img.is-artist {
    border-radius: 50%;
  }

  .col-group-name {
    overflow: hidden;
    font: 700 1.05rem/1.1 'Barlow Condensed', sans-serif;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .col-group-count {
    font: 500 0.82rem/1 'Barlow', sans-serif;
    color: var(--mid);
  }

  .col-group:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
