<script>
  import JsonLd from '$lib/components/JsonLd.svelte';
  import ZikleGame from "$lib/components/zikle/ZikleGame.svelte";
  import ZikleStage from "$lib/components/zikle/ZikleStage.svelte";

  let { data } = $props();

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Game",
    name: "Zikle",
    alternateName: "Zikle — la chanson du jour",
    url: "https://www.zik-music.fr/zikle",
    inLanguage: "fr-FR",
    genre: ["Jeu musical", "Blind test", "Jeu quotidien"],
    gamePlatform: "Navigateur web",
    numberOfPlayers: { "@type": "QuantitativeValue", value: 1 },
    description:
      "Jeu quotidien gratuit : devine la chanson du jour à partir d'un extrait audio qui s'allonge à chaque essai raté (1s, 2s, 4s, 7s, 11s, 16s). Six essais, un nouveau titre chaque jour, jouable sans compte.",
    isPartOf: {
      "@type": "WebSite",
      url: "https://www.zik-music.fr/",
      name: "ZIK",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Accueil",
          item: "https://www.zik-music.fr/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Zikle",
          item: "https://www.zik-music.fr/zikle",
        },
      ],
    },
  });
</script>

<svelte:head>
  <title>Zikle #{data.dayNumber ?? ""} - Devine la chanson du jour | ZIK</title>
  <meta name="description" content="Zikle : devine la chanson du jour à partir d'un extrait audio qui s'allonge à chaque essai. 6 essais, un nouveau titre chaque jour, gratuit et sans compte." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/zikle" />
  <meta property="og:title" content="Zikle - Devine la chanson du jour" />
  <meta property="og:description" content="Un extrait audio qui s'allonge à chaque essai raté. 6 essais pour deviner le titre du jour." />
  <meta property="og:url" content="https://www.zik-music.fr/zikle" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png?v=3.12.0" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Zikle - Devine la chanson du jour" />
  <meta name="twitter:description" content="Un extrait qui s'allonge à chaque essai raté. 6 essais pour deviner le titre du jour. Gratuit, sans compte." />
  <meta name="twitter:image" content="https://www.zik-music.fr/og.png?v=3.12.0" />
  <JsonLd json={jsonLd} />
</svelte:head>

<ZikleStage safeArea empty={data.date ? "" : "Pas de chanson aujourd'hui. Reviens un peu plus tard."}>
  <!-- La scène est volontairement centrée sans en-tête visible (cf. ZikleStage).
       Le h1 reste nécessaire pour la structure du document et le référencement :
       on le sort du flux visuel au lieu de l'empiler au-dessus du jeu. -->
  <h1 class="sr-only">
    Zikle{data.dayNumber ? ` #${data.dayNumber}` : ''} - devine la chanson du jour
  </h1>

  {#if data.date}
    <ZikleGame date={data.date} dayNumber={data.dayNumber} previewUrl={data.previewUrl} />
  {/if}
</ZikleStage>
