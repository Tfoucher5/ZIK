<script>
  import { isWork } from '$lib/shared/playlist/work.js';

  // Cases à trouver : l'œuvre d'abord (film, série…), puis artiste, feats,
  // autres réponses, titre
  let { slots, gameMode } = $props();
</script>

<div class="g-slots">
  {#if gameMode !== 'qcm'}
    {#each slots.extras as es, i (i)}
      {#if isWork(es.label)}
        <div class="g-slot g-slot-work {es.state || ''}">
          <span class="g-slot-label">{es.label}</span>
          <div class="g-slot-val">{es.val}</div>
        </div>
      {/if}
    {/each}
  {/if}
  <div class="g-slot {slots.artist.state || ''}">
    <span class="g-slot-label">Artiste</span>
    <div class="g-slot-val">{slots.artist.val}</div>
  </div>
  {#if gameMode !== 'qcm'}
    {#each slots.feats as fs, i (i)}
      <div class="g-slot g-slot-feat {fs.state || ''}">
        <span class="g-slot-label">{slots.feats.length > 1 ? `Feat. ${i+1}` : 'Feat.'}</span>
        <div class="g-slot-val">{fs.val}</div>
      </div>
    {/each}
    {#each slots.extras as es, i (i)}
      {#if !isWork(es.label)}
        <div class="g-slot {es.state || ''}">
          <span class="g-slot-label">{es.label}</span>
          <div class="g-slot-val">{es.val}</div>
        </div>
      {/if}
    {/each}
  {/if}
  <div class="g-slot {slots.title.state || ''}">
    <span class="g-slot-label">Titre</span>
    <div class="g-slot-val">{slots.title.val}</div>
  </div>
</div>
