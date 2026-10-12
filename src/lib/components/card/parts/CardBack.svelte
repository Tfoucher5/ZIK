<script>
  import CardFace from './CardFace.svelte';
  import CardVinyl from './CardVinyl.svelte';

  let { card, silhouette } = $props();

  const obtained = $derived(card.obtainedAt ? new Date(card.obtainedAt).toLocaleDateString('fr-FR') : '-');
</script>

<CardFace side="back">
  <CardVinyl back />
  {#if !silhouette}
    <dl class="zc-details">
      <div><dt>Album</dt><dd>{card.album}</dd></div>
      <div><dt>Genre</dt><dd>{card.genre}</dd></div>
      <div><dt>Fans de l'artiste</dt><dd>{card.fans.toLocaleString('fr-FR')}</dd></div>
      <div><dt>Obtenue le</dt><dd>{obtained}</dd></div>
      <div><dt>Premier à l'avoir</dt><dd>{card.firstOwner ?? '-'}</dd></div>
    </dl>
  {/if}
  <p class="zc-url-back">zik-music.fr</p>
  <p class="zc-source">Données et pochettes : Deezer</p>
</CardFace>

<style>
  .zc-details {
    position: absolute;
    top: 86cqw;
    right: 8cqw;
    left: 8cqw;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1.8cqw;
    margin: 0;
  }

  .zc-details div {
    display: flex;
    justify-content: space-between;
    gap: 3cqw;
    padding-bottom: 1.4cqw;
    border-bottom: 1px solid rgb(255 255 255 / 0.08);
  }

  .zc-details dt {
    font: 400 3.4cqw/1.2 'Barlow', sans-serif;
    color: rgb(255 255 255 / 0.55);
    white-space: nowrap;
  }

  .zc-details dd {
    min-width: 0;
    overflow: hidden;
    margin: 0;
    font: 600 3.6cqw/1.2 'Barlow', sans-serif;
    text-align: right;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .zc-url-back {
    position: absolute;
    right: 0;
    bottom: 8cqw;
    left: 0;
    margin: 0;
    font: 700 4.4cqw/1 'Barlow Condensed', sans-serif;
    letter-spacing: 0.04em;
    color: var(--rc-light);
    text-align: center;
  }

  .zc-source {
    position: absolute;
    right: 0;
    bottom: 3.5cqw;
    left: 0;
    margin: 0;
    font: 400 2.8cqw/1 'Barlow', sans-serif;
    color: rgb(255 255 255 / 0.35);
    text-align: center;
  }
</style>
