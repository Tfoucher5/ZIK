<script>
  import { NEWS } from '$lib/news.js';

  const TAG_COLORS = {
    'Nouveauté': 'new',
    'Amélioration': 'improve',
    'Correctif': 'fix',
  };

  function formatDate(iso) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Nouveautés — Blind Test ZIK",
    "url": "https://www.zik-music.fr/nouveautes",
    "description": "Les dernières nouveautés, améliorations et correctifs du blind test multijoueur ZIK.",
    "inLanguage": "fr-FR",
    "isPartOf": { "@type": "WebSite", "url": "https://www.zik-music.fr/", "name": "ZIK" },
  });
</script>

<svelte:head>
  <title>ZIK — Nouveautés | Les dernières mises à jour du blind test</title>
  <meta name="description" content="Suis les nouveautés du blind test ZIK : nouvelles fonctionnalités, améliorations et correctifs, mise à jour après mise à jour." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/nouveautes" />
  <meta property="og:title" content="Nouveautés — Blind Test ZIK" />
  <meta property="og:description" content="Les dernières mises à jour du blind test multijoueur ZIK." />
  <meta property="og:url" content="https://www.zik-music.fr/nouveautes" />
  <script type="application/ld+json">{@html jsonLd}</script>
</svelte:head>

<main class="news-root">
  <nav class="breadcrumb" aria-label="Fil d'Ariane">
    <a href="/">Accueil</a>
    <span class="breadcrumb-sep">/</span>
    <span>Nouveautés</span>
  </nav>

  <h1 class="news-title">Nouveautés</h1>
  <p class="news-subtitle">
    ZIK évolue en permanence. Retrouve ici les dernières fonctionnalités, améliorations et correctifs du site.
  </p>

  <div class="news-timeline">
    {#each NEWS as entry (entry.date + entry.title)}
      <article class="news-entry">
        <div class="news-entry-marker">
          <span class="news-dot news-dot--{TAG_COLORS[entry.tag]}"></span>
          <span class="news-line"></span>
        </div>
        <div class="news-entry-body">
          <header class="news-entry-header">
            <span class="news-tag news-tag--{TAG_COLORS[entry.tag]}">{entry.tag}</span>
            {#if entry.version}
              <span class="news-version">v{entry.version}</span>
            {/if}
            <time class="news-date" datetime={entry.date}>{formatDate(entry.date)}</time>
          </header>
          <h2 class="news-entry-title">{entry.title}</h2>
          <ul class="news-items">
            {#each entry.items as item (item)}
              <li>{item}</li>
            {/each}
          </ul>
        </div>
      </article>
    {/each}
  </div>

  <div class="news-footer-cta">
    <p>Une idée d'amélioration ? Un bug ?</p>
    <a class="news-cta-btn" href="/rooms">Jouer maintenant</a>
  </div>
</main>

<style>
.news-root {
  max-width: 760px;
  margin: 0 auto;
  padding: 100px 20px 60px;
}

.breadcrumb {
  display: flex;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text-muted, #9ca3af);
  margin-bottom: 24px;
}
.breadcrumb a { color: inherit; text-decoration: none; }
.breadcrumb a:hover { color: #fff; }

.news-title {
  font-family: "Barlow Condensed", sans-serif;
  font-size: clamp(2.2rem, 5vw, 3.2rem);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.5px;
  color: #fafafa;
  margin: 0 0 8px;
}

.news-subtitle {
  color: var(--text-muted, #9ca3af);
  font-size: 1.05rem;
  margin: 0 0 40px;
  line-height: 1.6;
}

.news-timeline { display: flex; flex-direction: column; }

.news-entry { display: flex; gap: 18px; }

.news-entry-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 16px;
}

.news-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
  box-shadow: 0 0 12px rgba(124, 58, 237, 0.5);
}
.news-dot--new { background: #7c3aed; }
.news-dot--improve { background: #2563eb; }
.news-dot--fix { background: #059669; }

.news-line {
  width: 2px;
  flex: 1;
  background: linear-gradient(to bottom, rgba(124, 58, 237, 0.4), rgba(124, 58, 237, 0.08));
  margin: 6px 0;
}

.news-entry:last-child .news-line { display: none; }

.news-entry-body { padding-bottom: 36px; min-width: 0; }

.news-entry-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.news-tag {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 3px 10px;
  border-radius: 999px;
}
.news-tag--new { background: rgba(124, 58, 237, 0.18); color: #c4b5fd; }
.news-tag--improve { background: rgba(37, 99, 235, 0.18); color: #93c5fd; }
.news-tag--fix { background: rgba(5, 150, 105, 0.18); color: #6ee7b7; }

.news-version {
  font-size: 0.78rem;
  font-weight: 600;
  color: #ff00ff;
  font-family: "Barlow Condensed", sans-serif;
}

.news-date {
  font-size: 0.82rem;
  color: var(--text-muted, #9ca3af);
}

.news-entry-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 10px;
}

.news-items {
  margin: 0;
  padding: 0 0 0 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--text-secondary, #d1d5db);
  line-height: 1.55;
  font-size: 0.95rem;
}

.news-footer-cta {
  margin-top: 24px;
  text-align: center;
  padding: 28px;
  border: 1px solid rgba(124, 58, 237, 0.25);
  border-radius: 16px;
  background: rgba(124, 58, 237, 0.06);
}
.news-footer-cta p {
  color: var(--text-secondary, #d1d5db);
  margin: 0 0 14px;
}
.news-cta-btn {
  display: inline-block;
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  color: #fff;
  font-weight: 700;
  padding: 10px 26px;
  border-radius: 999px;
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.news-cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.4);
}

@media (max-width: 600px) {
  .news-root { padding-top: 84px; }
  .news-entry { gap: 12px; }
}
</style>
