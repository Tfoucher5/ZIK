<script>
  import Card from './Card.svelte';
  import { RARITY_ORDER } from './rarity.js';

  /**
   * Cartes gagnées pendant la partie en cours, affichées dans le jeu.
   * Elles restent provisoires jusqu'à la manche de sécurisation (moitié de la
   * partie), puis deviennent toutes définitives en même temps.
   * variant : panel (colonne latérale) ou pill (bandeau compact sur mobile).
   */
  let { entries = [], round = 1, maxRounds = 10, variant = 'panel', off = null } = $props();

  const secureAt = $derived(Math.ceil(maxRounds / 2));
  const secured = $derived(round >= secureAt);
  const left = $derived(secureAt - round);
  const cards = $derived(entries.map((e) => e.card));
  const best = $derived(
    cards.reduce((a, c) => (RARITY_ORDER.indexOf(c.rarity) > RARITY_ORDER.indexOf(a?.rarity) ? c : a), null),
  );
  const status = $derived(
    secured
      ? `${entries.length > 1 ? `${entries.length} cartes sécurisées` : 'Carte sécurisée'}`
      : `Sécurisées à la manche ${secureAt}${left === 1 ? ', plus qu’une manche' : `, encore ${left} manches`}`,
  );
</script>

{#if variant === 'pill'}
  <div class="ct-pill" class:is-secured={secured} data-rarity={best?.rarity ?? 'none'}>
    <span class="ct-stack" aria-hidden="true">
      {#each cards.slice(-3) as card (card.id)}
        <img src={card.coverMd} alt="" />
      {/each}
    </span>
    <span class="ct-pill-text">
      <strong>{entries.length} carte{entries.length > 1 ? 's' : ''}</strong>
      <span>{secured ? 'sécurisée' + (entries.length > 1 ? 's' : '') : `en jeu, manche ${secureAt}`}</span>
    </span>
    <svg class="ct-ring" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="15" class="ct-ring-bg" />
      <circle
        cx="18"
        cy="18"
        r="15"
        class="ct-ring-fg"
        stroke-dasharray={`${Math.min(1, round / secureAt) * 94.25} 94.25`}
      />
    </svg>
  </div>
{:else}
  <section class="ct" class:is-secured={secured} aria-label="Cartes de la partie">
    <header class="ct-head">
      <span class="ct-title">Cartes de la partie</span>
      <span class="ct-count">{entries.length}</span>
    </header>

    {#if entries.length}
      <ul class="ct-list">
        {#each entries as entry (entry.card.id)}
          <li class="ct-item" title={`${entry.card.title}, manche ${entry.round}`}>
            <Card card={entry.card} size="mini" motion="none" inspectable list={cards} />
          </li>
        {/each}
      </ul>

      <div class="ct-track" role="img" aria-label={`Manche ${round} sur ${maxRounds}`}>
        {#each Array.from({ length: maxRounds }, (_, i) => i + 1) as n (n)}
          <span
            class="ct-seg"
            class:done={n <= round}
            class:goal={n === secureAt}
            class:won={entries.some((e) => e.round === n)}
          ></span>
        {/each}
      </div>
      <p class="ct-status">
        {#if secured}
          <svg viewBox="0 0 16 16" aria-hidden="true"
            ><rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg
          >
        {/if}
        {status}
      </p>
    {:else}
      <p class="ct-empty">{off ?? 'Trouve un titre en premier pour gagner sa carte.'}</p>
    {/if}
  </section>
{/if}

<style>
  .ct {
    display: grid;
    gap: 12px;
    padding: 14px;
    border: 1px solid rgb(255 255 255 / 0.1);
    border-radius: 12px;
    background: rgb(255 255 255 / 0.03);
    color: #f5f3f8;
    font-family: 'Barlow', sans-serif;
  }

  .ct-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .ct-title {
    font: 500 0.66rem/1 var(--g-mono, ui-monospace, monospace);
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgb(255 255 255 / 0.55);
  }

  .ct-count {
    font: 700 1.3rem/1 'Barlow Condensed', sans-serif;
    font-variant-numeric: tabular-nums;
  }

  .ct-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* Provisoires : un peu éteintes. Elles s'allument toutes une fois sécurisées. */
  .ct-item {
    filter: saturate(0.55) brightness(0.72);
    transition: filter 0.5s;
    animation: ct-in 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.3) backwards;
  }

  .ct.is-secured .ct-item {
    filter: none;
  }

  @keyframes ct-in {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.85);
    }
  }

  .ct-track {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 3px;
  }

  .ct-seg {
    position: relative;
    height: 5px;
    border-radius: 3px;
    background: rgb(255 255 255 / 0.12);
  }

  .ct-seg.done {
    background: rgb(255 255 255 / 0.55);
  }

  .ct.is-secured .ct-seg.done {
    background: #86efac;
  }

  /* Point au-dessus des manches où une carte a été gagnée */
  .ct-seg.won::before {
    content: '';
    position: absolute;
    top: -7px;
    left: 50%;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #f5f3f8;
    transform: translateX(-50%);
  }

  .ct-seg.goal::after {
    content: '';
    position: absolute;
    top: -4px;
    right: -2.5px;
    width: 2px;
    height: 13px;
    border-radius: 1px;
    background: #f5f3f8;
  }

  .ct-status {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: 0.8rem;
    color: rgb(255 255 255 / 0.6);
  }

  .ct.is-secured .ct-status {
    color: #86efac;
    font-weight: 600;
  }

  .ct-empty {
    margin: 0;
    font-size: 0.82rem;
    color: rgb(255 255 255 / 0.5);
  }

  .ct svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* ── Bandeau compact (mobile) ────────────────────────────────────────── */
  .ct-pill {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 5px 6px 5px 6px;
    border: 1px solid rgb(255 255 255 / 0.12);
    border-radius: 99px;
    background: rgb(20 20 26 / 0.85);
    backdrop-filter: blur(10px);
    color: #f5f3f8;
    font-family: 'Barlow', sans-serif;
  }

  .ct-stack {
    display: flex;
  }

  .ct-stack img {
    width: 26px;
    height: 26px;
    border: 2px solid #14141a;
    border-radius: 50%;
    object-fit: cover;
  }

  .ct-stack img + img {
    margin-left: -10px;
  }

  .ct-pill-text {
    display: grid;
    line-height: 1.1;
  }

  .ct-pill-text strong {
    font: 700 0.95rem/1.1 'Barlow Condensed', sans-serif;
  }

  .ct-pill-text span {
    font-size: 0.72rem;
    color: rgb(255 255 255 / 0.6);
  }

  .ct-pill.is-secured .ct-pill-text span {
    color: #86efac;
  }

  .ct-ring {
    width: 28px;
    height: 28px;
    transform: rotate(-90deg);
  }

  .ct-ring circle {
    fill: none;
    stroke-width: 3.5;
  }

  .ct-ring-bg {
    stroke: rgb(255 255 255 / 0.12);
  }

  .ct-ring-fg {
    stroke: var(--rc-light);
    stroke-linecap: round;
    transition: stroke-dasharray 0.5s;
  }

  .ct-pill.is-secured .ct-ring-fg {
    stroke: #86efac;
  }
</style>
