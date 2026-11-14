<script>
  import { reveal } from '$lib/components/home/reveal.js';
  import { POUR_QUI } from './soireeContent.js';
</script>

<section class="pq" use:reveal>
  <h2 class="pq-title">Pour qui</h2>
  <ul class="pq-list">
    {#each POUR_QUI as [qui, texte] (qui)}
      <li>
        <span class="pq-who">{qui}</span>
        <p>{texte}</p>
      </li>
    {/each}
  </ul>
</section>

<style>
  .pq {
    max-width: 1240px;
    margin: 0 auto;
    padding: clamp(48px, 8vh, 96px) clamp(16px, 5vw, 64px);
    border-top: 2px solid var(--text);
  }
  .pq-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--mid);
    margin-bottom: 20px;
  }
  .pq-list { list-style: none; padding: 0; margin: 0; }
  .pq-list li {
    display: grid;
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    gap: 12px 40px;
    align-items: baseline;
    padding: 18px 0;
    border-bottom: 1px solid var(--border);
  }
  .pq-who {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(2.4rem, 6vw, 4.6rem);
    line-height: 0.9;
    text-transform: uppercase;
  }
  .pq-list p { color: var(--mid); line-height: 1.55; }

  @media (max-width: 760px) {
    .pq-list li { grid-template-columns: minmax(0, 1fr); }
  }
</style>
