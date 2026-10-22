<script>
  import { duree } from './audioDebug.js';

  /** Extraits trouvés pour remplacer la source : on écoute, puis on choisit. */
  let { results, choisi, saving, onUse } = $props();
</script>

{#if results.length}
  <p class="tad-note">Écoute, puis remplace la source par celle qui correspond.</p>
  <ul class="tad-res">
    {#each results as r (r.source + (r.externalId ?? r.previewUrl))}
      <li class:chosen={choisi?.previewUrl === r.previewUrl}>
        {#if r.cover}
          <img src={r.cover} alt="" width="36" height="36">
        {/if}
        <div class="tad-res-txt">
          <span class="tad-res-t">{r.title}</span>
          <span class="tad-res-a">
            {r.artist}{r.album ? ` · ${r.album}` : ''}{r.duration ? ` · ${duree(r.duration)}` : ''}
          </span>
        </div>
        <span class="tad-src">{r.source}</span>
        <!-- svelte-ignore a11y_media_has_caption -->
        <audio controls preload="none" src={r.previewUrl}></audio>
        <button class="tad-btn tad-btn-use" onclick={() => onUse(r)} disabled={saving}>
          {saving ? '…' : 'Utiliser'}
        </button>
      </li>
    {/each}
  </ul>
{:else}
  <p class="tad-note">Aucun extrait écoutable pour cette recherche.</p>
{/if}

<style>
  .tad-res {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .tad-res li {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 7px 9px;
    background: var(--c-panel, #13161e);
    border: 1px solid var(--c-border, rgba(255, 255, 255, 0.07));
    border-radius: 8px;
  }
  .tad-res li.chosen { border-color: rgba(34, 197, 94, 0.5); }
  .tad-res img { border-radius: 4px; flex-shrink: 0; }
  .tad-res-txt { display: flex; flex-direction: column; flex: 1 1 160px; min-width: 0; }
  .tad-res-t {
    font-size: 0.82rem;
    color: var(--c-text, #e2e8f0);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tad-res-a { font-size: 0.74rem; color: var(--c-muted, #6b7280); }
  .tad-src {
    font-family: var(--mono);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--c-muted, #6b7280);
    border: 1px solid var(--c-border, rgba(255, 255, 255, 0.07));
    border-radius: 4px;
    padding: 2px 6px;
    flex-shrink: 0;
  }
  .tad-res audio { width: 200px; height: 30px; flex-shrink: 0; }

  @media (max-width: 640px) {
    .tad-res audio { width: 100%; }
  }
</style>
