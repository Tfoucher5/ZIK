<script>
  import Card from './Card.svelte';
  import { RARITIES } from './rarity.js';

  /** Une carte d'exemple par rareté, avec sa part du catalogue et sa condition d'exploit. */
  let { samples, totals } = $props();

  const fmt = (n) => (n ?? 0).toLocaleString('fr-FR');
  const pct = (r) => Math.max(1, Math.round(((totals.byRarity[r] ?? 0) / (totals.total || 1)) * 100));

  function condition(r) {
    const e = RARITIES[r].exploit;
    const parts = [`${e.players} joueurs connectés`];
    if (e.classic) parts.push(`trouvée en moins de ${e.classic / 1000} s (${e.qcm / 1000} s en QCM)`);
    if (e.notOwnPlaylist) parts.push('jamais sur sa propre playlist');
    return parts.join(', ');
  }
</script>

<ul class="ct-rarities">
  {#each samples as card (card.id)}
    <li class="ct-rarity" data-rarity={card.rarity}>
      <Card {card} size="sm" inspectable list={samples} />
      <div>
        <h3>{RARITIES[card.rarity].label}</h3>
        <p class="ct-share">{fmt(totals.byRarity[card.rarity])} cartes, environ {pct(card.rarity)}&nbsp;%</p>
        <p class="ct-cond">{condition(card.rarity)}</p>
      </div>
    </li>
  {/each}
</ul>

<style>
  .ct-rarities {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .ct-rarity {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--surface);
  }

  .ct-rarity h3 {
    margin: 0 0 6px;
    color: var(--rc, var(--text));
    font: 700 1.5rem/1 'Barlow Condensed', sans-serif;
  }

  .ct-share {
    margin: 0 0 8px;
    font-weight: 600;
  }

  .ct-cond {
    margin: 0;
    color: var(--mid);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  @media (max-width: 480px) {
    .ct-rarities {
      grid-template-columns: 1fr;
    }

    .ct-rarity {
      gap: 14px;
      padding: 12px;
    }
  }
</style>
