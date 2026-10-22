<script>
  import { pct } from '$lib/shared/admin/stats-utils.js';
  import { RARITIES } from '$lib/components/card/rarity.js';
  import { nf, plural } from './cardsAdmin.svelte.js';

  /** Répartition du catalogue par rareté, catalogue et chez les joueurs. */
  let { c, rarity, catalog, provisional } = $props();
</script>

<section class="a-section">
  <div class="a-section-head">
    <h2>Raretés</h2>
    <span class="a-muted count">{nf(catalog)} cartes</span>
  </div>
  <div class="stack" role="img" aria-label="Répartition du catalogue par rareté">
    {#each rarity as r (r.key)}
      {#if r.catalog}<i data-r={r.key} style:flex-grow={r.catalog} title="{RARITIES[r.key].label} : {pct(r.catalog, catalog)} %"></i>{/if}
    {/each}
  </div>
  <table class="rar">
    <thead><tr><th>Rareté</th><th class="num">Catalogue</th><th class="num">Chez les joueurs</th></tr></thead>
    <tbody>
      {#each rarity as r (r.key)}
        <tr>
          <td><button class="rar-name" type="button" onclick={() => c.go({ rarity: r.key, q: c.search.trim() })}><i class="dot" data-r={r.key}></i>{RARITIES[r.key].label}</button></td>
          <td class="num">{nf(r.catalog)} <span class="a-muted">{pct(r.catalog, catalog)} %</span></td>
          <td class="num">{nf(r.owned)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  <p class="a-muted note">
    {plural(provisional, 'carte')} en ascension : sorties récentes ou ajoutées pendant les fêtes, leur rareté est revue chaque mois. Les autres sont figées.
  </p>
</section>

<style>
  .stack { display: flex; height: 14px; overflow: hidden; border-radius: 99px; background: var(--a-surface2); }
  .stack i { flex-basis: 0; min-width: 3px; background: var(--rc); }
  .rar { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  .rar th { padding: 4px 0 8px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; text-align: left; text-transform: uppercase; color: var(--a-dim); }
  .rar td { padding: 7px 0; border-top: 1px solid var(--a-line); }
  .rar .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .rar .num span { display: inline-block; min-width: 46px; font-size: 0.78rem; }
  .rar-name { padding: 0; border: 0; background: none; color: var(--a-fg); font: inherit; font-weight: 600; cursor: pointer; }
  .rar-name:hover { color: var(--a-accent); }
</style>
