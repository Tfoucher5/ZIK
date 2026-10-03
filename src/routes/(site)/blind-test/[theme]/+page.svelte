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
          <li><a href="/blind-test/{t.slug}">Blind test {t.name.toLowerCase()}</a></li>
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
    max-width: 860px;
    margin: 0 auto;
    padding: calc(var(--nav-h) + 32px) 24px 96px;
  }
  .bt-crumbs { font-size: 0.8rem; color: var(--dim); margin-bottom: 40px; }
  .bt-crumbs a { color: var(--mid); text-underline-offset: 3px; }
  .bt-header { padding-bottom: 40px; margin-bottom: 40px; border-bottom: 2px solid var(--text); }
  .bt-kicker {
    display: block;
    margin-bottom: 14px;
    line-height: 1;
    font-weight: 400;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.72rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--accent);
  }
  h1 {
    font-family: "Barlow Condensed", sans-serif;
    font-size: clamp(3rem, 10vw, 6.4rem);
    font-weight: 900;
    letter-spacing: -0.02em;
    line-height: 0.86;
    text-transform: uppercase;
    margin: 12px 0 32px;
  }
  .bt-intro { font-size: 1rem; color: var(--mid); line-height: 1.7; margin-bottom: 14px; }

  .bt-ctas { display: flex; flex-wrap: wrap; gap: 16px; }
  .bt-cta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 240px;
    padding: 16px 20px;
    border: 2px solid var(--text);
    border-radius: 3px;
    text-decoration: none;
    color: var(--text);
    transition: transform 0.1s, box-shadow 0.1s;
  }
  .bt-cta:hover { transform: translate(-2px, -2px); box-shadow: 4px 4px 0 var(--text); }
  .bt-cta b { font-family: "Barlow Condensed", sans-serif; font-size: 1.35rem; font-weight: 900; text-transform: uppercase; }
  .bt-cta span { font-size: 0.82rem; color: var(--mid); }
  .bt-cta-main { background: var(--accent); color: var(--on-accent); box-shadow: 4px 4px 0 var(--text); }
  .bt-cta-main:hover { box-shadow: 6px 6px 0 var(--text); }
  .bt-cta-main span { color: rgb(0 0 0 / 0.7); }

  .bt-section { margin-bottom: 36px; padding-bottom: 36px; border-bottom: 1px solid var(--border); }
  .bt-section:last-of-type { border-bottom: none; }
  .bt-section h2 {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--mid);
    margin-bottom: 16px;
  }
  .bt-section p, .bt-section li, .bt-faq dd { font-size: 0.95rem; color: var(--mid); line-height: 1.7; }

  .bt-artists { display: flex; flex-wrap: wrap; gap: 4px 18px; list-style: none; padding: 0; margin-top: 12px; }
  .bt-section .bt-artists li {
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 800;
    font-size: 1.5rem;
    line-height: 1.2;
    text-transform: uppercase;
    color: var(--text);
  }
  .bt-steps { list-style: none; padding: 0; counter-reset: step; display: flex; flex-direction: column; gap: 14px; }
  .bt-steps li { counter-increment: step; position: relative; padding-left: 40px; }
  .bt-steps li::before {
    content: counter(step, decimal-leading-zero);
    position: absolute;
    left: 0;
    top: 3px;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.8rem;
    color: var(--accent);
  }
  .bt-steps b { color: var(--text); }
  .bt-tips { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .bt-tips li { padding-left: 22px; position: relative; }
  .bt-tips li::before { content: "→"; position: absolute; left: 0; color: var(--text); }
  .bt-faq dt { font-weight: 700; color: var(--text); margin-top: 18px; font-size: 1rem; }
  .bt-faq dt:first-child { margin-top: 0; }
  .bt-faq dd { margin: 4px 0 0; }
  .bt-others { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0 24px; }
  .bt-section .bt-others li { border-bottom: 1px solid var(--border); }
  .bt-others a { display: block; padding: 9px 0; color: var(--text); text-decoration: none; }
  .bt-others a:hover { color: var(--accent); }
  .bt-pro a { color: var(--text); text-underline-offset: 3px; }
  .bt-pro { margin-top: 20px; }

  @media (max-width: 600px) {
    .bt-page { padding: calc(var(--nav-h) + 20px) 16px 72px; }
    .bt-cta { min-width: 0; width: 100%; }
  }
</style>
