<script>
  // Cases à trouver : artiste, feats, réponses en plus, titre
  let { slots, gameMode } = $props();
</script>

<div class="g-slots">
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
      <div class="g-slot {es.state || ''}">
        <span class="g-slot-label">{es.label}</span>
        <div class="g-slot-val">{es.val}</div>
      </div>
    {/each}
  {/if}
  <div class="g-slot {slots.title.state || ''}">
    <span class="g-slot-label">Titre</span>
    <div class="g-slot-val">{slots.title.val}</div>
  </div>
</div>
