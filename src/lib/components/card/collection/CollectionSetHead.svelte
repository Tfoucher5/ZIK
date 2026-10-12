<script>
  import { artistPhoto, photoFallback } from './collection.js';
  import CollectionProgress from './CollectionProgress.svelte';

  let { detail, owned } = $props();
</script>

<header class="col-set-head">
  {#if detail.set.kind === 'artist'}
    <img src={artistPhoto(detail.set.key)} alt="" class="col-set-cover is-artist" onerror={(e) => photoFallback(e, detail.set.cover_url)} />
  {:else if detail.set.cover_url}
    <img src={detail.set.cover_url} alt="" class="col-set-cover" />
  {/if}
  <div>
    <p class="col-kicker">{detail.set.kind === 'album' ? 'Album' : 'Artiste'}</p>
    <h2 id="set-title" class="col-set-title">{detail.set.name}</h2>
    <CollectionProgress width={`${(owned / detail.cards.length) * 100}%`} label={`${owned} cartes sur ${detail.cards.length}`} />
    <p class="col-set-count">
      {owned} / {detail.cards.length} cartes{#if owned === detail.cards.length}<strong>, set complet</strong>{/if}
    </p>
  </div>
</header>

<style>
  .col-set-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 20px;
    margin-bottom: 26px;
  }

  .col-set-cover {
    width: 120px;
    height: 120px;
    border-radius: 10px;
    object-fit: cover;
    box-shadow: 0 12px 30px rgb(0 0 0 / 0.3);
  }

  /* Photo d'artiste ronde, comme sur les plateformes de streaming */
  .col-set-cover.is-artist {
    border-radius: 50%;
  }

  .col-kicker {
    margin: 0;
    font: 600 0.8rem/1 'Barlow', sans-serif;
    color: var(--mid);
  }

  .col-set-title {
    margin: 4px 0 10px;
    font: 700 clamp(1.8rem, 4vw, 2.6rem) / 1 'Barlow Condensed', sans-serif;
  }

  .col-set-count {
    margin: 8px 0 0;
    font-size: 0.9rem;
    color: var(--mid);
  }
</style>
