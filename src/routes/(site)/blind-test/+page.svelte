<script>
  import JsonLd from '$lib/components/JsonLd.svelte';
  import { BLIND_TEST_THEMES } from '$lib/blindTestThemes.js';

  const SITE = 'https://www.zik-music.fr';
  const description = 'Blind test gratuit par thème : années 80, années 2000, rap français, rock, Disney, musiques de films… À jouer en ligne ou en soirée sur la TV avec les téléphones.';

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Blind test par thème - ZIK',
    description,
    url: `${SITE}/blind-test`,
    inLanguage: 'fr-FR',
    hasPart: BLIND_TEST_THEMES.map((t) => ({
      '@type': 'WebPage',
      name: t.h1,
      url: `${SITE}/blind-test/${t.slug}`,
    })),
  });

  const genres = BLIND_TEST_THEMES.filter((t) => !t.occasion);
  const occasions = BLIND_TEST_THEMES.filter((t) => t.occasion);
</script>

<svelte:head>
  <title>Blind test par thème gratuit - années 80, rap, Disney… | ZIK</title>
  <meta name="description" content={description} />
  <link rel="canonical" href="{SITE}/blind-test" />
  <meta property="og:title" content="Blind test par thème - ZIK" />
  <meta property="og:description" content={description} />
  <meta property="og:url" content="{SITE}/blind-test" />
  <meta property="og:type" content="website" />
  <JsonLd json={jsonLd} />
</svelte:head>

<main class="bt-index">
  <header class="bt-head">
    <p class="bt-kicker">Blind test gratuit</p>
    <h1>Un thème,<br>une soirée.</h1>
    <p class="bt-lead">
      Choisissez une époque, un style ou une occasion : chaque thème se joue en ligne ou en soirée,
      avec la musique sur la TV et les réponses sur les téléphones. Gratuit, sans application.
    </p>
  </header>

  <section>
    <h2>Par style et par époque</h2>
    <ol class="bt-rows">
      {#each genres as t, i (t.slug)}
        <li>
          <a href="/blind-test/{t.slug}">
            <span class="bt-num">{String(i + 1).padStart(2, '0')}</span>
            <span class="bt-name">{t.name}</span>
            <span class="bt-arrow" aria-hidden="true">→</span>
          </a>
        </li>
      {/each}
    </ol>
  </section>

  <section>
    <h2>Pour une occasion</h2>
    <ol class="bt-rows">
      {#each occasions as t, i (t.slug)}
        <li>
          <a href="/blind-test/{t.slug}">
            <span class="bt-num">{String(i + 1).padStart(2, '0')}</span>
            <span class="bt-name">{t.name}</span>
            <span class="bt-arrow" aria-hidden="true">→</span>
          </a>
        </li>
      {/each}
    </ol>
  </section>

  <p class="bt-own">
    Vous animez un lieu ou un événement ? <a href="/pro">ZIK Pro</a> : joueurs illimités, jusqu'à 8 équipes et une régie complète.
  </p>
  <p class="bt-own">
    Votre thème n'est pas là ? <a href="/salon">Ouvrez un salon</a> avec vos propres playlists Spotify ou Deezer.
  </p>
</main>

<style>
  .bt-index {
    max-width: 960px;
    margin: 0 auto;
    padding: calc(var(--nav-h) + 48px) 24px 96px;
  }
  .bt-head { padding-bottom: 40px; border-bottom: 2px solid var(--text); }
  .bt-kicker {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.72rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 18px;
  }
  h1 {
    font-family: "Barlow Condensed", sans-serif;
    font-size: clamp(3rem, 9vw, 6rem);
    font-weight: 900;
    line-height: 0.86;
    letter-spacing: -0.02em;
    text-transform: uppercase;
  }
  .bt-lead { max-width: 560px; margin-top: 22px; font-size: 1rem; color: var(--mid); line-height: 1.65; }
  section { margin-top: 56px; }
  h2 {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--mid);
    margin-bottom: 8px;
  }
  .bt-rows { list-style: none; padding: 0; border-top: 1px solid var(--border2); }
  .bt-rows a {
    display: grid;
    grid-template-columns: 56px 1fr auto;
    align-items: baseline;
    padding: 14px 8px;
    border-bottom: 1px solid var(--border2);
    color: var(--text);
    text-decoration: none;
  }
  .bt-num { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 0.78rem; color: var(--dim); }
  .bt-name {
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 800;
    font-size: clamp(1.6rem, 4vw, 2.4rem);
    line-height: 1;
    text-transform: uppercase;
  }
  .bt-arrow { font-size: 1.4rem; color: var(--dim); transition: transform 0.15s; }
  .bt-rows a:hover { background: var(--text); color: var(--bg); }
  .bt-rows a:hover .bt-num, .bt-rows a:hover .bt-arrow { color: var(--bg); }
  .bt-rows a:hover .bt-arrow { transform: translateX(-6px); }
  .bt-own { margin-top: 48px; font-size: 0.95rem; color: var(--mid); }
  .bt-own a { color: var(--text); text-underline-offset: 3px; }

  @media (max-width: 600px) {
    .bt-index { padding: calc(var(--nav-h) + 28px) 16px 72px; }
    .bt-rows a { grid-template-columns: 40px 1fr auto; padding: 12px 4px; }
  }
</style>
