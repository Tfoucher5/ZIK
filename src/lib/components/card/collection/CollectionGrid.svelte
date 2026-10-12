<script>
  import Card from '../Card.svelte';
  import { pendingLabel } from './collection.js';

  /** Grille de cartes ; en mode set, les cartes non possédées sont en silhouette. */
  let { cards, list, set = false } = $props();
</script>

<ul class="col-grid">
  {#each cards as c (c.id)}
    {#if set}
      <li>
        {#if c.owned}
          <Card card={c} size="sm" inspectable {list} />
        {:else}
          <Card card={c} size="sm" face="silhouette" motion="none" />
        {/if}
      </li>
    {:else}
      <li class="col-item">
        <Card card={c} size="sm" inspectable {list} />
        {#if c.pending}<span class="col-pending">{pendingLabel(c)}</span>{/if}
      </li>
    {/if}
  {/each}
</ul>

<style>
  .col-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 22px 14px;
    justify-items: center;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .col-grid > li {
    content-visibility: auto;
    contain-intrinsic-size: 150px 210px;
  }

  .col-item {
    position: relative;
  }

  .col-pending {
    position: absolute;
    right: 6px;
    bottom: 6px;
    left: 6px;
    padding: 4px 6px;
    border-radius: 6px;
    background: rgb(0 0 0 / 0.75);
    color: #fff;
    font: 600 0.7rem/1.2 'Barlow', sans-serif;
    text-align: center;
  }
</style>
