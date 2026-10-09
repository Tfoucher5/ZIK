<script>
  import { RARITIES } from '$lib/components/card/rarity.js';
  import { openCard } from '$lib/components/card/cardViewer.svelte.js';

  /** Pochettes des cartes les plus rares d'un joueur, ouvertes dans la visionneuse. */
  let { cards = [] } = $props();
</script>

{#if cards.length}
  <ul class="thumbs">
    {#each cards as c (c.id)}
      <li>
        <button
          type="button"
          data-rarity={c.rarity}
          title={`${c.title} - ${c.artist} · ${RARITIES[c.rarity].label}`}
          aria-label={`Voir la carte ${RARITIES[c.rarity].label} : ${c.title}, ${c.artist}`}
          onclick={() => openCard(c, cards)}
        >
          <img src={c.coverMd} alt="" loading="lazy" width="38" height="38" />
        </button>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .thumbs {
    display: flex;
    list-style: none;
  }
  .thumbs li + li {
    margin-left: -10px;
  }
  button {
    display: block;
    padding: 0;
    border: 2px solid var(--rc);
    border-radius: 6px;
    background: var(--bg2);
    cursor: pointer;
    overflow: hidden;
    box-shadow: 0 2px 10px rgb(0 0 0 / 0.45);
    transition: transform 0.15s;
  }
  button:hover,
  button:focus-visible {
    transform: translateY(-3px) rotate(-3deg);
    position: relative;
    z-index: 1;
  }
  img {
    display: block;
    width: 38px;
    height: 38px;
    object-fit: cover;
  }
  button[data-rarity='mythic'] {
    box-shadow: 0 0 12px color-mix(in srgb, var(--rarity-mythic) 60%, transparent);
  }
</style>
