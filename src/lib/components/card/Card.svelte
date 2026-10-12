<script>
  import { RARITIES } from './rarity.js';
  import { cardTilt } from './cardTilt.js';
  import { openCard } from './cardViewer.svelte.js';
  import CardFront from './parts/CardFront.svelte';
  import CardBack from './parts/CardBack.svelte';

  let {
    card,
    size = 'md',
    face = 'front',
    motion = 'hover',
    inspectable = false,
    list = null,
    reveal = false,
    discOut = false,
    gyro = false,
  } = $props();

  const silhouette = $derived(face === 'silhouette');
  const label = $derived(RARITIES[card.rarity].label);
  const cover = $derived(size === 'lg' || size === 'xl' ? card.coverXl : card.coverMd);
  const name = $derived(silhouette ? 'Carte à découvrir' : `Carte ${label} : ${card.title}, ${card.artist}`);
</script>

{#snippet body()}
  <div
    class="zc"
    data-rarity={silhouette ? 'none' : card.rarity}
    data-size={size}
    data-motion={motion}
    class:is-back={face === 'back'}
    class:is-silhouette={silhouette}
    class:is-revealing={reveal}
    class:disc-out={discOut}
    style:--tone={card.color}
    style:--cover={`url("${card.coverMd}")`}
    role="img"
    aria-label={name}
    use:cardTilt={{ enabled: motion !== 'none', strength: motion === 'full' ? 1 : 0.45, gyro }}
  >
    <div class="zc-inner">
      <div class="zc-flip">
        <CardFront {card} {silhouette} {label} {cover} />
        <CardBack {card} {silhouette} />
      </div>
    </div>
  </div>
{/snippet}

{#if inspectable}
  <button type="button" class="zc-hit" aria-label={`Voir en grand : ${name}`} onclick={() => openCard(card, list)}>
    {@render body()}
  </button>
{:else}
  {@render body()}
{/if}

<style>
  /* ── Gabarit ───────────────────────────────────────────────────────────── */
  /* Variables de pressage (disque, feuille, reflets) : parts/CardPressing.svelte */
  .zc {
    --w: 230px;
    position: relative;
    display: block;
    width: var(--w);
    aspect-ratio: 5 / 7;
    container-type: inline-size;
    perspective: 1100px;
    /* Le reflet suit l'inclinaison avec un léger temps de retard, comme une vraie lumière */
    transition:
      --mx 0.3s ease-out,
      --my 0.3s ease-out,
      --sheen 0.3s ease-out;
    font-family: 'Barlow', sans-serif;
    color: #f5f3f8;
    text-align: left;
    user-select: none;
    -webkit-user-select: none;
  }

  .zc[data-size='mini'] { --w: 64px; }
  .zc[data-size='sm'] { --w: 150px; }
  .zc[data-size='md'] { --w: 230px; }
  .zc[data-size='lg'] { --w: 300px; }
  .zc[data-size='xl'] { --w: min(400px, 76vw, calc(62dvh * 5 / 7)); }

  .zc-inner,
  .zc-flip {
    position: absolute;
    inset: 0;
    transform-style: preserve-3d;
  }

  .zc-inner {
    transform: rotateX(var(--rx)) rotateY(var(--ry));
    transition: transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  :global(.zc.is-tilting) .zc-inner {
    transition: transform 0.08s linear;
  }

  .zc-flip {
    transition: transform 0.65s cubic-bezier(0.3, 0.7, 0.2, 1);
  }

  .zc.is-back .zc-flip {
    transform: rotateY(180deg);
  }

  /* ── Révélation de fin de manche ──────────────────────────────────────── */
  .zc.is-revealing .zc-inner {
    animation: zc-pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.25) backwards;
  }

  .zc.is-revealing {
    animation: zc-sheen-sweep 0.75s ease-in-out 1.35s backwards;
  }

  @keyframes zc-pop {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(4cqw);
    }
  }

  @keyframes zc-sheen-sweep {
    from {
      --sheen: -90deg;
      --mx: -15%;
      --my: 10%;
    }
    to {
      --sheen: 150deg;
      --mx: 115%;
      --my: 70%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .zc,
    .zc :global(*) {
      animation: none !important;
      transition: none !important;
    }
  }

  /* ── Carte cliquable ──────────────────────────────────────────────────── */
  .zc-hit {
    display: inline-block;
    padding: 0;
    border: 0;
    border-radius: 12px;
    background: none;
    color: inherit;
    font: inherit;
    cursor: zoom-in;
  }

  .zc-hit:focus-visible {
    outline: 2px solid var(--rarity-mythic);
    outline-offset: 6px;
  }
</style>
