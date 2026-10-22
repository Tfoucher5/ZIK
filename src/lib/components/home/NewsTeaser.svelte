<script>
  import { NEWS } from '$lib/data/news.js';
  import { reveal } from './reveal.js';

  const latestNews = NEWS[0];
</script>

{#if latestNews}
<a href="/nouveautes" class="news-teaser" use:reveal>
  <span class="news-teaser-badge"><span class="news-teaser-dot" aria-hidden="true"></span>Quoi de neuf</span>
  <span class="news-teaser-title">{latestNews.title}</span>
  <span class="news-teaser-cta">Voir les nouveautés →</span>
</a>
{/if}

<style>
  .news-teaser {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin: 40px 48px 0;
    padding: 20px 24px;
    border: 1px solid rgb(var(--c-glass) / 0.1);
    background: rgb(var(--c-glass) / 0.02);
    transition: border-color 0.15s, background 0.15s;
  }
  .news-teaser:hover {
    border-color: rgb(var(--accent-rgb) / 0.3);
    background: rgb(var(--accent-rgb) / 0.03);
  }
  .news-teaser-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--accent);
    flex-shrink: 0;
  }
  .news-teaser-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent);
  }
  .news-teaser-title {
    font-weight: 600;
    font-size: 0.92rem;
    flex: 1;
    min-width: 0;
  }
  .news-teaser-cta {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--mid);
    flex-shrink: 0;
  }
  .news-teaser:hover .news-teaser-cta { color: var(--accent); }

  @media (max-width: 900px) {
    .news-teaser { margin: 32px 24px 0; }
  }
</style>
