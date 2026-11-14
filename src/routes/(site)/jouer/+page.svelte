<script>
  import JsonLd from '$lib/components/ui/JsonLd.svelte';
  import OnlineHome from '$lib/components/home/OnlineHome.svelte';
  import { gameJsonLd, gameFaqJsonLd } from '$lib/components/home/seo.js';

  let { data } = $props();
</script>

<svelte:head>
  <title>Blind test en ligne gratuit et multijoueur | ZIK</title>
  <meta name="description" content="Rejoins une room, crée la tienne avec tes playlists Deezer, joue au Zikle du jour et grimpe au classement. Blind test en ligne gratuit, avec ou sans compte." />
  <link rel="canonical" href="https://www.zik-music.fr/jouer" />
  <meta property="og:title" content="Blind test en ligne gratuit et multijoueur | ZIK" />
  <meta property="og:description" content="Rooms par thème, playlists Deezer, Zikle du jour et classements. Gratuit, sans appli." />
  <meta property="og:url" content="https://www.zik-music.fr/jouer" />
  <JsonLd json={gameJsonLd} />
  <JsonLd json={gameFaqJsonLd} />
</svelte:head>

<OnlineHome {data} soiree={false} />
