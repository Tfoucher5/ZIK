<script>
  import CardFace from './CardFace.svelte';
  import CardPressing from './CardPressing.svelte';
  import CardVinyl from './CardVinyl.svelte';
  import CardInfo from './CardInfo.svelte';

  let { card, silhouette, label, cover } = $props();
</script>

<CardFace side="front">
  <CardPressing />
  {#if !silhouette}
    <div class="zc-disc">
      <CardVinyl />
      <div class="zc-sheen"></div>
    </div>
  {/if}
  <img class="zc-cover" src={cover} alt="" loading="lazy" draggable="false" />
  <div class="zc-gloss"></div>
  {#snippet overlay()}
    <div class="zc-obi">
      <span class="zc-obi-num">n° {card.number}</span>
      <span class="zc-obi-rarity">{silhouette ? '?' : label}</span>
    </div>
    <CardInfo {card} {silhouette} />
    <span class="zc-url">zik-music.fr</span>
  {/snippet}
</CardFace>

<style>
  /* Reflet de pochette plastifiée, visible seulement quand on bouge la carte */
  .zc-gloss {
    position: absolute;
    z-index: 2;
    top: 5cqw;
    left: 14cqw;
    width: 70cqw;
    aspect-ratio: 1;
    border-radius: 1cqw;
    background: linear-gradient(
      115deg,
      transparent 38%,
      rgb(255 255 255 / 0.05) 44%,
      rgb(255 255 255 / 0.15) 49%,
      rgb(255 255 255 / 0.05) 54%,
      transparent 60%
    );
    background-size: 260% 260%;
    background-position: var(--mx) var(--my);
    mix-blend-mode: screen;
    opacity: 0;
    transition: opacity 0.35s;
    pointer-events: none;
  }

  :global(.zc.is-tilting) .zc-gloss {
    opacity: 1;
  }

  /* ── Pochette ─────────────────────────────────────────────────────────── */
  .zc-cover {
    position: absolute;
    z-index: 2;
    top: 5cqw;
    left: 14cqw;
    width: 70cqw;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 1cqw;
    box-shadow:
      1.2cqw 1.6cqw 3.5cqw rgb(0 0 0 / 0.55),
      0 0 0 1px rgb(255 255 255 / 0.06);
  }

  /* ── Disque ───────────────────────────────────────────────────────────── */
  .zc-disc {
    position: absolute;
    z-index: 1;
    top: 8cqw;
    left: 31cqw;
    width: 64cqw;
    aspect-ratio: 1;
    transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  :global(.zc.disc-out) .zc-disc {
    transform: translateX(44cqw);
  }

  .zc-sheen {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: var(--sheen-img);
    opacity: var(--sheen-o);
    mix-blend-mode: screen;
    mask: radial-gradient(circle closest-side, transparent 0 40%, #000 44% 95%, transparent 97%);
    pointer-events: none;
  }

  /* ── Obi ──────────────────────────────────────────────────────────────── */
  .zc-obi {
    position: absolute;
    z-index: 3;
    top: 0;
    bottom: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    width: 11cqw;
    padding: 4.5cqw 0;
    border-radius: 4.5cqw 0 0 4.5cqw;
    background: linear-gradient(180deg, var(--rc-light), var(--rc) 55%, var(--rc-dark));
    box-shadow: 0.6cqw 0 1.8cqw rgb(0 0 0 / 0.35);
    color: var(--rc-ink);
  }

  .zc-obi span {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    white-space: nowrap;
  }

  .zc-obi-rarity {
    font: 700 5.4cqw/1 'Barlow Condensed', sans-serif;
    letter-spacing: 0.04em;
  }

  .zc-obi-num {
    font: 600 3.3cqw/1 'Barlow Condensed', sans-serif;
    font-variant-numeric: tabular-nums;
    opacity: 0.75;
  }

  .zc-url {
    position: absolute;
    z-index: 3;
    right: 5cqw;
    bottom: 1.3cqw;
    font: 600 2.4cqw/1 'Barlow', sans-serif;
    letter-spacing: 0.03em;
    color: rgb(255 255 255 / 0.4);
  }

  /* ── Pressages ────────────────────────────────────────────────────────── */
  :global(.zc[data-rarity='legendary']) .zc-cover {
    outline: 0.5cqw solid #e2b24c;
    outline-offset: 0.6cqw;
  }

  :global(.zc[data-rarity='legendary']) .zc-obi-rarity {
    text-shadow: 0 0.25cqw 0 rgb(255 255 255 / 0.45);
  }

  :global(.zc[data-rarity='mythic']) .zc-obi {
    background: linear-gradient(calc(var(--sheen) + 90deg), #ff8ade, #d4a5ff, #8ff0ff, #ffc6ee, #ff8ade);
  }

  /* ── Silhouette ───────────────────────────────────────────────────────── */
  :global(.zc.is-silhouette) .zc-cover {
    filter: grayscale(1) blur(2.2cqw) brightness(0.5);
  }

  /* ── Petites tailles ──────────────────────────────────────────────────── */
  @container (max-width: 120px) {
    .zc-url,
    .zc-obi-num {
      display: none;
    }

    .zc-cover {
      top: 30cqw;
    }

    .zc-disc {
      top: 32cqw;
    }
  }

  /* ── Révélation de fin de manche ──────────────────────────────────────── */
  :global(.zc.is-revealing) .zc-obi {
    animation: zc-obi 0.45s ease-out 0.15s backwards;
  }

  :global(.zc.is-revealing) .zc-disc {
    animation: zc-disc-in 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) 0.5s backwards;
  }

  @keyframes zc-obi {
    from {
      clip-path: inset(0 0 100% 0);
    }
    to {
      clip-path: inset(0);
    }
  }

  @keyframes zc-disc-in {
    from {
      transform: translateX(-17cqw);
    }
  }
</style>
