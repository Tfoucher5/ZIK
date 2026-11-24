<script>
  import JsonLd from '#lib/components/ui/JsonLd.svelte';
  import { siteJsonLd } from './seo.js';
  import { faqJsonLd } from '#lib/components/accueil/guide.js';

  const TITLE = 'ZIK : blind test en ligne ou en soirée, gratuit, sans appli';
  const DESC = 'Joue au blind test en ligne contre d\'autres joueurs, ou anime une soirée : la TV diffuse la musique, chacun répond sur son téléphone. Gratuit, sans appli.';
</script>

<svelte:head>
  <title>{TITLE}</title>
  <meta name="description" content={DESC} />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/" />
  <meta property="og:title" content={TITLE} />
  <meta property="og:description" content={DESC} />
  <meta property="og:url" content="https://www.zik-music.fr/" />
  <meta name="twitter:title" content={TITLE} />
  <meta name="twitter:description" content={DESC} />
  <JsonLd json={siteJsonLd} />
  <JsonLd json={faqJsonLd} />
</svelte:head>
