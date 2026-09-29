<script>
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
  <script type="application/ld+json">{@html jsonLd}</script>
  <script type="application/ld+json">{@html faqJsonLd}</script>
</svelte:head>

<main class="bt-page">
  <nav class="bt-crumbs" aria-label="Fil d'Ariane">
    <a href="/">Accueil</a> › <a href="/blind-test">Blind test par thème</a> › <span>{theme.name}</span>
  </nav>

  <article>
    <header class="bt-header">
      <span class="bt-emoji" aria-hidden="true">{theme.emoji}</span>
      <h1>{theme.h1}</h1>
      {#each theme.intro as p, i (i)}
        <p class="bt-intro">{p}</p>
      {/each}
    </header>

    <div class="bt-ctas">
      <a class="bt-cta bt-cta-main" href={salonHref}>
        <b>🎉 Lancer en soirée</b>
        <span>La TV diffuse, les invités répondent sur leur téléphone</span>
      </a>
      {#if theme.room}
        <a class="bt-cta" href="/room/{theme.room}">
          <b>🎧 Jouer en ligne</b>
          <span>Rejoindre la room officielle, tout de suite</span>
        </a>
      {/if}
    </div>

    {#if data.artists.length}
      <section class="bt-section">
        <h2>Au programme</h2>
        <p>Parmi les artistes les plus présents dans la playlist :</p>
        <ul class="bt-artists">
          {#each data.artists as artist (artist)}
            <li>{artist}</li>
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
          <li><a href="/blind-test/{t.slug}">{t.emoji} Blind test {t.name.toLowerCase()}</a></li>
        {/each}
      </ul>
      <p class="bt-pro">
        Un bar, une association, une entreprise ? <a href="/pro">Le guide pour organiser votre blind test</a>.
      </p>
    </section>
  </article>
</main>

<style>
  .bt-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px clamp(16px, 5vw, 48px) 80px;
  }
  .bt-crumbs { font-size: 0.8rem; color: var(--dim); margin-bottom: 28px; }
  .bt-crumbs a { color: var(--accent); }
  .bt-header { margin-bottom: 28px; }
  .bt-emoji { font-size: 2.2rem; }
  h1 {
    font-family: "Barlow Condensed", sans-serif;
    font-size: clamp(1.8rem, 4vw, 2.6rem);
    font-weight: 900;
    letter-spacing: -1px;
    line-height: 1.1;
    margin: 8px 0 16px;
  }
  .bt-intro { font-size: 0.95rem; color: var(--mid); line-height: 1.7; margin-bottom: 12px; }

  .bt-ctas { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 40px; }
  .bt-cta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 18px 20px;
    border: 1px solid var(--border2);
    border-radius: 14px;
    text-decoration: none;
    color: var(--text);
    transition: border-color 0.15s, transform 0.15s;
  }
  .bt-cta:hover { border-color: var(--accent); transform: translateY(-2px); }
  .bt-cta b { font-family: "Barlow Condensed", sans-serif; font-size: 1.15rem; }
  .bt-cta span { font-size: 0.82rem; color: var(--mid); }
  .bt-cta-main { background: var(--accent); border-color: var(--accent); color: #000; }
  .bt-cta-main span { color: rgb(0 0 0 / 0.7); }

  .bt-section { margin-bottom: 32px; padding-bottom: 32px; border-bottom: 1px solid var(--border); }
  .bt-section:last-of-type { border-bottom: none; }
  .bt-section h2 {
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.25rem;
    font-weight: 800;
    margin-bottom: 12px;
  }
  .bt-section p, .bt-section li, .bt-faq dd { font-size: 0.9rem; color: var(--mid); line-height: 1.7; }

  .bt-artists { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0; margin-top: 10px; }
  .bt-artists li {
    padding: 4px 12px;
    border: 1px solid var(--border2);
    border-radius: 999px;
    font-size: 0.82rem;
    color: var(--text);
  }
  .bt-steps { padding-left: 20px; display: flex; flex-direction: column; gap: 8px; }
  .bt-steps b { color: var(--text); }
  .bt-tips { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .bt-tips li { padding-left: 18px; position: relative; }
  .bt-tips li::before { content: "→"; position: absolute; left: 0; color: var(--accent); font-weight: 700; }
  .bt-faq dt { font-weight: 700; color: var(--text); margin-top: 14px; font-size: 0.92rem; }
  .bt-faq dd { margin: 4px 0 0; }
  .bt-others { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 6px; }
  .bt-others a, .bt-pro a { color: var(--accent); }
  .bt-pro { margin-top: 16px; }
</style>
