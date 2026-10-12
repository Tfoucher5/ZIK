<script>
  import { FAQ } from './faq.js';
  import { reveal } from './reveal.js';
</script>

<section class="faq-section" id="faq" use:reveal>
  <h2 class="faq-title">Questions fréquentes</h2>
  <div class="faq-list">
    {#each FAQ as f (f.q)}
      <details class="faq-item">
        <summary class="faq-q">{f.q}</summary>
        <p class="faq-a">{f.a}</p>
      </details>
    {/each}
  </div>
</section>

<style>
  .faq-section {
    padding: 72px clamp(20px, 5vw, 72px);
    /* width explicite : flex item (body) + margin auto ⇒ sinon largeur au contenu, les encadrés bougent à l'ouverture */
    width: 100%;
    max-width: 1000px;
    margin: 0 auto;
  }
  .faq-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(1.8rem, 3.5vw, 2.6rem);
    text-transform: uppercase;
    letter-spacing: -0.5px;
    margin-bottom: 32px;
  }
  .faq-list { display: flex; flex-direction: column; gap: 8px; }
  .faq-item {
    background: rgb(var(--c-glass) / 0.02);
    border: 1px solid var(--border);
    overflow: hidden;
    transition: border-color 0.15s;
  }
  .faq-item[open] { border-color: var(--border2); }
  .faq-q {
    font-size: 0.9rem;
    font-weight: 700;
    padding: 16px 20px;
    cursor: pointer;
    list-style: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .faq-q::after { content: '+'; font-size: 1.1rem; color: var(--accent); flex-shrink: 0; }
  .faq-item[open] .faq-q::after { content: '−'; }
  .faq-a { font-size: 0.84rem; color: var(--mid); line-height: 1.65; padding: 0 20px 16px; margin: 0; }

  @media (max-width: 900px) {
    .faq-section { padding: 48px 24px; }
  }

  @media (max-width: 600px) {
    .faq-section { padding: 60px 16px; }
    .faq-list { gap: 10px; }
    .faq-a { line-height: 1.75; }
  }
</style>
