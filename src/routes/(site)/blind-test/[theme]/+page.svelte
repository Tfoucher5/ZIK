<script>
  import JsonLd from '$lib/components/JsonLd.svelte';
  let { data } = $props();

  const SITE = 'https://www.zik-music.fr';

  let theme = $derived(data.theme);
  let url = $derived(`${SITE}/blind-test/${theme.slug}`);
  let salonHref = $derived(`/salon?playlist=${theme.playlists.join(',')}`);

  let jsonLd = $derived(JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: theme.title,
    description: theme.description,
    url,
    inLanguage: 'fr-FR',
    isPartOf: { '@type': 'WebSite', url: `${SITE}/`, name: 'ZIK' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Blind test par thème', item: `${SITE}/blind-test` },
        { '@type': 'ListItem', position: 3, name: theme.h1, item: url },
      ],
    },
  }));

  let faqJsonLd = $derived(JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: theme.faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }));
</script>

<svelte:head>
  <title>{theme.title}</title>
  <meta name="description" content={theme.description} />
  <link rel="canonical" href={url} />
  <meta property="og:title" content={theme.title} />
  <meta property="og:description" content={theme.description} />
  <meta property="og:url" content={url} />
  <meta property="og:type" content="website" />
  <JsonLd json={jsonLd} />
  <JsonLd json={faqJsonLd} />
  <link rel="stylesheet" href="/css/blind-test.css?v=3.19.0" />
</svelte:head>

<main class="bt-page">
  <nav class="bt-crumbs" aria-label="Fil d'Ariane">
    <a href="/">Accueil</a> › <a href="/blind-test">Blind test par thème</a> › <span>{theme.name}</span>
  </nav>

  <article>
    <header class="bt-header">
      <h1><span class="bt-kicker">Blind test</span>{theme.h1.replace(/^Blind test /i, '')}</h1>
      <div class="bt-ctas">
        <a class="bt-cta bt-cta-main" href={salonHref}>
          <b>Lancer en soirée</b>
          <span>La TV diffuse, les invités répondent sur leur téléphone</span>
        </a>
        {#if theme.pro}
          <a class="bt-cta" href="/pro#tarifs">
            <b>ZIK Pro</b>
            <span>Joueurs illimités, 8 équipes, régie complète. Dès 7,90 € la soirée</span>
          </a>
        {/if}
        {#if theme.room}
          <a class="bt-cta" href="/room/{theme.room}">
            <b>Jouer en ligne</b>
            <span>Rejoindre la room officielle, tout de suite</span>
          </a>
        {/if}
      </div>
    </header>

    <section class="bt-section">
      {#each theme.intro as p, i (i)}
        <p class="bt-intro">{p}</p>
      {/each}
    </section>

    {#if data.artists.length}
      <section class="bt-section">
        <h2>Au programme</h2>
        <p>Parmi les artistes les plus présents dans la playlist :</p>
        <ul class="bt-artists">
          {#each data.artists as artist (artist.name)}
            <li>{#if artist.slug}<a href="/blind-test/artiste/{artist.slug}">{artist.name}</a>{:else}{artist.name}{/if}</li>
          {/each}
        </ul>
      </section>
    {/if}

    <section class="bt-section">
      <h2>Comment ça marche</h2>
      <ol class="bt-steps">
        <li><b>Ouvrez le salon</b> sur l'écran principal : TV, ordinateur ou vidéoprojecteur.</li>
        <li><b>Les joueurs scannent le QR code</b> avec leur téléphone et choisissent un pseudo. Aucun compte à créer.</li>
        <li><b>Un extrait passe à chaque manche</b> : trouvez l'artiste et le titre avant les autres. Le classement s'affiche en direct.</li>
      </ol>
    </section>

    <section class="bt-section">
      <h2>Nos conseils</h2>
      <ul class="bt-tips">
        {#each theme.tips as tip, i (i)}
          <li>{tip}</li>
        {/each}
      </ul>
    </section>

    <section class="bt-section">
      <h2>Questions fréquentes</h2>
      <dl class="bt-faq">
        {#each theme.faq as { q, a } (q)}
          <dt>{q}</dt>
          <dd>{a}</dd>
        {/each}
      </dl>
    </section>

    <section class="bt-section">
      <h2>Autres thèmes</h2>
      <ul class="bt-others">
        {#each data.others as t (t.slug)}
          <li><a href="/blind-test/{t.slug}">Blind test {t.name.toLowerCase()}</a></li>
        {/each}
      </ul>
      <p class="bt-pro">
        Un bar, une association, une entreprise ? <a href="/pro">Le guide pour organiser votre blind test</a>.
      </p>
    </section>
  </article>
</main>
