<script>
  import { version } from '$app/environment';
  import { page } from '$app/state';
  import SalonRelance from '$lib/components/salon/relance/SalonRelance.svelte';
  import { screenOf } from '$lib/components/salon/relance/relance.js';

  let { children } = $props();

  // Hors des trois écrans (404 sous /salon) : le téléphone, l'écran le plus
  // sobre, sans média ni action de régie
  const ecran = $derived(screenOf(page.url.pathname) ?? 'play');
  const code = $derived((page.url.searchParams.get('code') ?? '').toUpperCase().slice(0, 12));
</script>

<svelte:head>
  {#each ["base/v2", "salon/shared", "salon/tv-stage", "salon/tv-calm", "salon/tv-screens", "salon/tv-ranking", "salon/tv-evening", "salon/phone", "salon/phone-lobby"] as f (f)}<link rel="stylesheet" href="/css/{f}.css?v={version}">{/each}
</svelte:head>

<div class="v2">
  <svelte:boundary>
    {@render children()}
    {#snippet failed(error, reset)}
      <SalonRelance {ecran} {code} {version} {error} onRemount={reset} />
    {/snippet}
  </svelte:boundary>
</div>
