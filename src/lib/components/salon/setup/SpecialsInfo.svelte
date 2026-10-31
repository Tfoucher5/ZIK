<script>
  import InfoTip from '$lib/components/ui/InfoTip.svelte';
  import { SPECIALS } from '$lib/data/salonOptions.js';
</script>

<InfoTip label="Les manches spéciales">
  <span class="si-intro">Environ une manche sur quatre, tirée au hasard (jamais la première, jamais deux de suite). La TV et les téléphones l'annoncent.</span>
  {#each Object.values(SPECIALS) as s (s.label)}
    <span class="si-ligne"><b>{s.label}</b> : {s.hint.toLowerCase()}.</span>
  {/each}
</InfoTip>

<style>
  .si-intro, .si-ligne { display: block; }
  .si-intro { margin-bottom: 8px; color: var(--mid); }
  .si-ligne + .si-ligne { margin-top: 4px; }
</style>
