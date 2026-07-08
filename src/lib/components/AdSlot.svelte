<script>
  import { getContext } from 'svelte';
  import { ADSENSE_CLIENT } from '$lib/ads.js';

  let { adSlot = '', height = 100 } = $props();

  const zik = getContext('zik');
  const show = $derived(
    !!adSlot && zik.authReady && zik.user?.profile?.role !== 'super_admin'
  );

  let insEl = $state(null);
  let pushed = false;

  $effect(() => {
    if (insEl && !pushed) {
      pushed = true;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch { /* bloqueur de pub */ }
    }
  });
</script>

{#if show}
  <div class="ad-box" style="--ad-h: {height}px">
    <span class="ad-label">Publicité</span>
    <ins
      bind:this={insEl}
      class="adsbygoogle"
      style="display:block;width:100%;height:{height}px"
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={adSlot}
    ></ins>
  </div>
{/if}

<style>
  .ad-box {
    max-width: 728px;
    margin: 28px auto;
    padding: 10px 12px 12px;
    min-height: calc(var(--ad-h) + 38px);
    border: 1px solid var(--border);
    border-radius: var(--r, 8px);
    background: var(--surface);
  }
  .ad-box:has(ins[data-ad-status='unfilled']) { display: none; }
  .ad-label {
    display: block;
    margin-bottom: 8px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.62rem;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--dim);
  }
</style>
