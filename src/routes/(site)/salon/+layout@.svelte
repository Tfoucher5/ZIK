<script>
  import { version } from '$app/environment';
  let { children } = $props();
</script>

<svelte:head>
  {#each ["shared", "tv-stage", "tv-calm", "tv-screens", "tv-end", "tv-end-join", "tv-ranking", "tv-evening", "phone", "phone-lobby"] as f (f)}<link rel="stylesheet" href="/css/salon/{f}.css?v={version}">{/each}
</svelte:head>

{@render children()}
