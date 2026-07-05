<script>
  let { children } = $props();
</script>

<svelte:head>
  <link rel="stylesheet" href="/css/salon.css?v=3.0.0">
</svelte:head>

{@render children()}
