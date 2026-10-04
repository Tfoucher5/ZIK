<script>
  import { page } from '$app/stores';
  import CollectionView from '$lib/components/card/CollectionView.svelte';

  const username = $derived($page.params.username);
</script>

<svelte:head>
  <title>Collection de {username} | ZIK</title>
  <meta name="robots" content="noindex, follow" />
</svelte:head>

<CollectionView {username} />
