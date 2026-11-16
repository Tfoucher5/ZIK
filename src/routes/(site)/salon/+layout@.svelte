<script>
  import { version } from '$app/environment';
  let { children } = $props();
</script>

<svelte:head>
  {#each ["base/v2", "salon/shared", "salon/tv-stage", "salon/tv-calm", "salon/tv-screens", "salon/tv-ranking", "salon/tv-evening", "salon/phone", "salon/phone-lobby"] as f (f)}<link rel="stylesheet" href="/css/{f}.css?v={version}">{/each}
</svelte:head>

<div class="v2">{@render children()}</div>
