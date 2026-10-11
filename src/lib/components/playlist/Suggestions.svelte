<script>
  import TrackResult from './TrackResult.svelte';

  let { sugg, store, onArtist, onAlbum } = $props();

  $effect(() => { if (sugg.needsLoad()) sugg.load(); });
</script>

{#if sugg.hasSeeds}
  <section class="sg">
    <div class="sg-head">
      <h3>Pour ta playlist</h3>
      {#if sugg.pool.length}<button class="sg-more" onclick={() => sugg.more()} disabled={sugg.loading}>↻ Autres</button>{/if}
    </div>
    {#if sugg.loading && !sugg.pool.length}
      <p class="sg-msg">Recherche de suggestions...</p>
    {:else}
      {#each sugg.shown as t (t.external_id)}
        <TrackResult track={t} {store} {onArtist} {onAlbum} />
      {/each}
    {/if}
  </section>
{/if}

<section class="sg-tips">
  <h3>Pour aller vite</h3>
  <ul>
    <li><kbd>Entrée</kbd> ajoute le premier résultat, <kbd>↑</kbd> <kbd>↓</kbd> pour en choisir un autre</li>
    <li>Colle une <strong>liste de titres</strong> (une par ligne), même copiée d'un site ou d'une note</li>
    <li>Colle un lien de <strong>playlist, album ou artiste Deezer</strong></li>
    <li>Colle un lien <strong>YouTube</strong> pour imposer une version précise (live, remix, 8-bit...)</li>
  </ul>
</section>

<style>
  .sg { display: flex; flex-direction: column; margin-bottom: 16px; }
  .sg-head { display: flex; align-items: center; justify-content: space-between; padding: 0 8px 6px; }
  h3 { margin: 0; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--dim); }
  .sg-more { border: none; background: none; color: var(--accent); font: inherit; font-size: 0.74rem; cursor: pointer; padding: 6px 0; }
  .sg-msg { padding: 8px; font-size: 0.78rem; color: var(--mid); }
  .sg-tips { padding: 8px; }
  .sg-tips ul { margin: 8px 0 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; font-size: 0.78rem; color: var(--mid); }
  kbd {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.66rem;
    padding: 1px 5px;
    border: 1px solid var(--border2);
    border-radius: 4px;
    color: var(--text);
  }
  @media (hover: none) { .sg-tips li:first-child { display: none; } }
</style>
