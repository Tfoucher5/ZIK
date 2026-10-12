<script>
  import JsonLd from '$lib/components/JsonLd.svelte';
  import { jsonLd, faqJsonLd } from './seo.js';
</script>

<svelte:head>
  <title>ZIK - Blind test en soirée sur la TV et multijoueur en ligne</title>
  <meta name="description" content="Le blind test de soirée : la TV diffuse la musique, chacun répond sur son téléphone, en solo ou en équipes. Aussi en ligne, avec tes playlists Deezer. Gratuit, sans appli." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/" />
  <meta property="og:title" content="ZIK - Le blind test de soirée sur la TV" />
  <meta property="og:description" content="La TV diffuse, les téléphones répondent. Équipes, classement en direct, podium, vos playlists Deezer. Aussi en ligne. Gratuit, sans appli." />
  <meta property="og:url" content="https://www.zik-music.fr/" />
  <meta name="twitter:title" content="ZIK - Le blind test de soirée sur la TV" />
  <meta name="twitter:description" content="La TV diffuse, les téléphones répondent. En équipes, avec vos playlists. Aussi en ligne. Gratuit, sans appli." />
  <JsonLd json={jsonLd} />
  <JsonLd json={faqJsonLd} />
</svelte:head>
