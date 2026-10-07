<script>
  import { RARITIES, RARITY_ORDER } from '$lib/components/card/rarity.js';

  /** Répartition des cartes d'un joueur par rareté, de Commune à Mythique. */
  let { byRarity = {}, legend = false } = $props();

  const parts = $derived(RARITY_ORDER.map((r) => ({ r, n: byRarity[r] ?? 0 })).filter((p) => p.n > 0));
  const title = $derived(parts.map((p) => `${p.n} ${RARITIES[p.r].label}`).join(' · '));
</script>

<div class="rbar" {title}>
  <div class="rbar-track" role="img" aria-label={title}>
    {#each parts as p (p.r)}
      <i data-rarity={p.r} style:flex-grow={p.n}></i>
    {/each}
  </div>
  {#if legend}
    <ul class="rbar-legend">
      {#each parts.toReversed() as p (p.r)}
        <li data-rarity={p.r}><b>{p.n}</b> {RARITIES[p.r].label}</li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .rbar-track {
    display: flex;
    gap: 2px;
    height: 6px;
    border-radius: 3px;
    overflow: hidden;
    background: var(--surface2);
  }
  .rbar-track i {
    flex-basis: 3px;
    background: var(--rc);
  }
  .rbar-track i[data-rarity='mythic'] {
    background: linear-gradient(90deg, #ff8ade, #d4a5ff, #8ff0ff);
  }
  .rbar-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin-top: 10px;
    list-style: none;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--dim);
  }
  .rbar-legend b {
    color: var(--rc);
    font-size: 0.9rem;
  }
</style>
