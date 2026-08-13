<script>
  let { children } = $props();
</script>

<svelte:head>
  <link rel="stylesheet" href="/css/salon.css?v=3.3.2">
</svelte:head>

{@render children()}
