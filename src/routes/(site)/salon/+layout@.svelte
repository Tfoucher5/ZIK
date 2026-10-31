<script>
  let { children } = $props();
</script>

<svelte:head>
  {#each ["shared", "tv-stage", "tv-screens", "tv-end", "tv-ranking", "tv-evening", "phone", "phone-lobby"] as f (f)}<link rel="stylesheet" href="/css/salon/{f}.css?v=3.21.0">{/each}
</svelte:head>

{@render children()}
