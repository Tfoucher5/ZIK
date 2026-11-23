<script>
  import { page } from '$app/stores';
  import CollectionView from '$lib/components/card/CollectionView.svelte';

  const username = $derived($page.params.username);
</script>

<svelte:head>
  <title>Collection de {username} | ZIK</title>
  <meta name="description" content={`Les cartes musicales de ${username} sur ZIK, gagnées en blind test.`} />
  <meta property="og:title" content={`Collection de ${username} | ZIK`} />
  <meta property="og:description" content="Ses cartes musicales gagnées en blind test, de Commune à Mythique." />
  <meta name="robots" content="noindex, follow" />
</svelte:head>

<CollectionView {username} />
