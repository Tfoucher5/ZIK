<script>
  import { version } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import SalonRelance from '#lib/components/salon/relance/SalonRelance.svelte';
  import { screenOf } from '#lib/components/salon/relance/relance.js';
  import ErreurSite from '../../+error.svelte';

  const ecran = $derived(screenOf(page.url.pathname));
  const code = $derived((page.url.searchParams.get('code') ?? '').toUpperCase().slice(0, 12));
  const relance = $derived(ecran && !(page.status >= 400 && page.status < 500));

  // Kit 3 ne réarme ses frontières qu'à la navigation : on renavigue sur place, sans recharger
  const remonter = () => goto(page.url.pathname + page.url.search, { replace: true, refreshAll: true });
</script>

{#if relance}
  <SalonRelance {ecran} {code} {version} error={page.error} onRemount={remonter} />
{:else}
  <ErreurSite />
{/if}
