<script>
  let { card, silhouette } = $props();

  const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });

  const popularity = $derived(
    (card.rank / 10_000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  );
  const found = $derived(card.successRate == null ? '-' : `${Math.round(card.successRate * 100)} %`);
</script>

<div class="zc-info">
  {#if silhouette}
    <p class="zc-title">Carte à découvrir</p>
  {:else}
    <p class="zc-title">{card.title}</p>
    <p class="zc-artist">{card.artist}</p>
    <p class="zc-album">{card.album}, {card.year}</p>
  {/if}
</div>
{#if !silhouette}
  <dl class="zc-stats">
    <div><dt>popularité</dt><dd class="zc-pop">{popularity}</dd></div>
    <div><dt>fans</dt><dd>{compact.format(card.fans)}</dd></div>
    <div><dt>trouvée</dt><dd>{found}</dd></div>
  </dl>
{/if}

<style>
  .zc-info,
  .zc-stats {
    text-shadow: 0 0.3cqw 1.4cqw rgb(0 0 0 / 0.6);
  }

  .zc-info {
    position: absolute;
    z-index: 3;
    top: 81cqw;
    right: 5cqw;
    left: 15cqw;
  }

  .zc-info p {
    margin: 0;
    overflow: hidden;
  }

  .zc-title {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    font: 700 9.6cqw/0.95 'Barlow Condensed', sans-serif;
    letter-spacing: -0.01em;
    text-wrap: balance;
  }

  .zc-artist {
    margin-top: 1.4cqw !important;
    font: 600 4.6cqw/1.15 'Barlow', sans-serif;
    color: rgb(255 255 255 / 0.9);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .zc-album {
    margin-top: 0.4cqw !important;
    font: 400 3.6cqw/1.25 'Barlow', sans-serif;
    color: rgb(255 255 255 / 0.72);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .zc-stats {
    position: absolute;
    z-index: 3;
    right: 5cqw;
    bottom: 4.5cqw;
    left: 15cqw;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2cqw;
    margin: 0;
    padding-top: 2.6cqw;
    border-top: 1px solid rgb(255 255 255 / 0.14);
  }

  .zc-stats div {
    display: flex;
    flex-direction: column-reverse;
    gap: 0.6cqw;
  }

  .zc-stats dd {
    margin: 0;
    font: 600 5.8cqw/1 'Barlow Condensed', sans-serif;
    font-variant-numeric: tabular-nums;
  }

  .zc-stats dt {
    font: 500 2.9cqw/1 'Barlow', sans-serif;
    color: rgb(255 255 255 / 0.68);
  }

  .zc-pop {
    color: var(--rc-light);
  }

  :global(.zc.is-silhouette) .zc-title {
    color: rgb(255 255 255 / 0.45);
  }

  @container (max-width: 120px) {
    .zc-info,
    .zc-stats {
      display: none;
    }
  }
</style>
