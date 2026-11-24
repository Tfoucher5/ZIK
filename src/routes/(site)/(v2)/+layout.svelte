<script>
  import { version } from '$app/environment';
  import TopBand from '#lib/components/layout/TopBand.svelte';

  let { children } = $props();

  $effect(() => {
    const html = document.documentElement;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => html.classList.toggle('rm', mq.matches || html.classList.contains('no-animations'));
    sync();
    mq.addEventListener('change', sync);
    return () => {
      mq.removeEventListener('change', sync);
      html.classList.remove('rm');
    };
  });
</script>

<svelte:head>
  {#each ['v2'] as f (f)}<link rel="stylesheet" href="/css/base/{f}.css?v={version}" />{/each}
</svelte:head>

<div class="v2">
  <TopBand />
  {@render children()}
</div>
