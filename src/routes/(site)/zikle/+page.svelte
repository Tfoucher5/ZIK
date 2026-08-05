<script>
  import ZikleGame from "$lib/components/ZikleGame.svelte";

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
  <title>Zikle #{data.dayNumber ?? ""} — Devine la chanson du jour | ZIK</title>
  <meta name="description" content="Zikle : devine la chanson du jour à partir d'un extrait audio qui s'allonge à chaque essai. 6 essais, un nouveau titre chaque jour, gratuit et sans compte." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/zikle" />
  <meta property="og:title" content="Zikle — Devine la chanson du jour" />
  <meta property="og:description" content="Un extrait audio qui s'allonge à chaque essai raté. 6 essais pour deviner le titre du jour." />
  <meta property="og:url" content="https://www.zik-music.fr/zikle" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Zikle — Devine la chanson du jour" />
  <meta name="twitter:description" content="Un extrait qui s'allonge à chaque essai raté. 6 essais pour deviner le titre du jour. Gratuit, sans compte." />
  <meta name="twitter:image" content="https://www.zik-music.fr/og.png" />
  <script type="application/ld+json">{@html jsonLd}</script>
</svelte:head>

<main class="zikle-page">
  <div class="zikle-glow" aria-hidden="true"></div>

  {#if !data.date}
    <p class="zikle-empty">Pas de chanson aujourd'hui. Reviens un peu plus tard.</p>
  {:else}
    <ZikleGame date={data.date} dayNumber={data.dayNumber} previewUrl={data.previewUrl} />
  {/if}
</main>

<style>
  /* Une seule zone plein écran : la scène est centrée dans le viewport,
     sans en-tête empilé au-dessus (sinon le jeu est poussé hors de l'écran). */
  .zikle-page {
    position: relative;
    /* La nav est fixe : on réserve sa hauteur sans dépasser le viewport,
       sinon la page défile dès qu'on interagit. */
    min-height: calc(100dvh - var(--nav-h));
    margin-top: var(--nav-h);
    padding: 32px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .zikle-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    width: min(120vw, 900px);
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, rgb(var(--accent-rgb) / 0.09), transparent 62%);
    pointer-events: none;
    z-index: 0;
  }
  .zikle-empty {
    color: var(--mid);
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  @media (max-width: 768px) {
    .zikle-page {
      /* Laisse la place à la bottom-nav mobile */
      padding-bottom: 64px;
    }
  }
</style>
