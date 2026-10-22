<script>
  import { RARITIES, RARITY_ORDER } from '$lib/components/card/rarity.js';

  /** Recherche d'une carte par numéro, titre, artiste ou rareté. */
  let { c, results, rarity, cardNumber, card } = $props();
</script>

<section class="a-section" id="chercher">
  <div class="a-section-head"><h2>Chercher une carte</h2></div>
  <form class="a-toolbar" onsubmit={(e) => { e.preventDefault(); c.go({ q: c.search.trim(), card: null }); }}>
    <label class="a-search">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <span class="a-sr">Numéro, titre ou artiste</span>
      <input type="search" placeholder="Numéro, titre ou artiste" bind:value={c.search} />
    </label>
    <button class="a-btn">Chercher</button>
  </form>
  <div class="a-chips">
    <button class="a-chip" type="button" aria-pressed={!rarity} onclick={() => c.go({ rarity: null })}>Toutes</button>
    {#each RARITY_ORDER as r (r)}
      <button class="a-chip" type="button" aria-pressed={rarity === r} onclick={() => c.go({ rarity: r })}><i class="dot" data-r={r}></i>{RARITIES[r].label}</button>
    {/each}
  </div>
  {#if cardNumber && !card}
    <p class="a-err">Carte n° {cardNumber} introuvable.</p>
  {/if}
  {#if results}
    <ul class="a-list">
      {#each results as r (r.id)}
        <li>
          <a class="a-row" href={c.href({ card: r.number })}>
            <i class="bar" data-r={r.rarity}></i>
            <span class="a-row-main">
              <span class="a-row-title">{r.title}</span>
              <span class="a-row-sub">n° {r.number} · {r.artist}{r.year ? ` · ${r.year}` : ''}</span>
            </span>
            {#if !r.rarity_locked_at}<em class="a-tag accent">en ascension</em>{/if}
          </a>
        </li>
      {:else}
        <li class="a-empty">Aucune carte trouvée.</li>
      {/each}
    </ul>
  {:else}
    <p class="a-muted note">Tape un numéro, un titre ou un artiste, ou choisis une rareté pour voir les dernières cartes créées.</p>
  {/if}
</section>
