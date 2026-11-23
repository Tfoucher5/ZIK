<script>
  import { version } from '$app/environment';
  import { page } from '$app/state';
  import SalonRelance from '$lib/components/salon/relance/SalonRelance.svelte';
  import { screenOf } from '$lib/components/salon/relance/relance.js';
  import ErreurSite from '../../+error.svelte';

  const ecran = $derived(screenOf(page.url.pathname));
  const code = $derived((page.url.searchParams.get('code') ?? '').toUpperCase().slice(0, 12));
  const relance = $derived(ecran && !(page.status >= 400 && page.status < 500));
</script>

{#if relance}
  <SalonRelance {ecran} {code} {version} error={page.error} />
{:else}
  <ErreurSite />
{/if}
