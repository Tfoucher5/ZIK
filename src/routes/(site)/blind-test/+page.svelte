<script>
  import { BLIND_TEST_THEMES } from '$lib/blindTestThemes.js';

  const SITE = 'https://www.zik-music.fr';
  const description = 'Blind test gratuit par thème : années 80, années 2000, rap français, rock, Disney, musiques de films… À jouer en ligne ou en soirée sur la TV avec les téléphones.';

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Blind test par thème — ZIK',
    description,
    url: `${SITE}/blind-test`,
    inLanguage: 'fr-FR',
    hasPart: BLIND_TEST_THEMES.map((t) => ({
      '@type': 'WebPage',
      name: t.h1,
      url: `${SITE}/blind-test/${t.slug}`,
    })),
  });

  const genres = BLIND_TEST_THEMES.filter((t) => !['anniversaire', 'mariage'].includes(t.slug));
  const occasions = BLIND_TEST_THEMES.filter((t) => ['anniversaire', 'mariage'].includes(t.slug));
</script>

<svelte:head>
  <title>Blind test par thème gratuit — années 80, rap, Disney… | ZIK</title>
  <meta name="description" content={description} />
  <link rel="canonical" href="{SITE}/blind-test" />
  <meta property="og:title" content="Blind test par thème — ZIK" />
  <meta property="og:description" content={description} />
  <meta property="og:url" content="{SITE}/blind-test" />
  <meta property="og:type" content="website" />
  <script type="application/ld+json">{@html jsonLd}</script>
</svelte:head>

<main class="bt-index">
  <h1>Blind test par thème</h1>
  <p class="bt-lead">
    Choisissez une époque, un style ou une occasion : chaque thème se joue en ligne ou en soirée,
    avec la musique sur la TV et les réponses sur les téléphones. Gratuit, sans application.
  </p>

  <h2>Par style et par époque</h2>
  <ul class="bt-grid">
    {#each genres as t (t.slug)}
      <li>
        <a href="/blind-test/{t.slug}">
          <span class="bt-emoji" aria-hidden="true">{t.emoji}</span>
          <b>Blind test {t.name.toLowerCase()}</b>
        </a>
      </li>
    {/each}
  </ul>

  <h2>Pour une occasion</h2>
  <ul class="bt-grid">
    {#each occasions as t (t.slug)}
      <li>
        <a href="/blind-test/{t.slug}">
          <span class="bt-emoji" aria-hidden="true">{t.emoji}</span>
          <b>{t.h1}</b>
        </a>
      </li>
    {/each}
    <li>
      <a href="/pro">
        <span class="bt-emoji" aria-hidden="true">🍻</span>
        <b>Bar, association, entreprise</b>
      </a>
    </li>
  </ul>

  <p class="bt-lead">
    Votre thème n'est pas là ? <a href="/salon">Créez un salon</a> avec vos propres playlists Spotify ou Deezer.
  </p>
</main>

<style>
  .bt-index {
    max-width: 900px;
    margin: 0 auto;
    padding: 40px clamp(16px, 5vw, 48px) 80px;
  }
  h1 {
    font-family: "Barlow Condensed", sans-serif;
    font-size: clamp(1.8rem, 4vw, 2.6rem);
    font-weight: 900;
    letter-spacing: -1px;
    margin-bottom: 12px;
  }
  h2 {
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.25rem;
    font-weight: 800;
    margin: 32px 0 12px;
  }
  .bt-lead { font-size: 0.95rem; color: var(--mid); line-height: 1.7; margin-top: 24px; }
  .bt-lead a { color: var(--accent); }
  .bt-grid {
    list-style: none;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px;
  }
  .bt-grid a {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 18px;
    border: 1px solid var(--border2);
    border-radius: 14px;
    color: var(--text);
    text-decoration: none;
    transition: border-color 0.15s, transform 0.15s;
  }
  .bt-grid a:hover { border-color: var(--accent); transform: translateY(-2px); }
  .bt-emoji { font-size: 1.6rem; }
</style>
