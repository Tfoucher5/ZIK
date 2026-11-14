<script>
  import { FAQ } from './soireeContent.js';
</script>

<section class="sf" id="faq">
  <h2>Questions fréquentes</h2>
  <div>
    {#each FAQ as f (f.q)}
      <details>
        <summary>{f.q}</summary>
        <p>{f.a}</p>
      </details>
    {/each}
  </div>
</section>

<style>
  .sf {
    max-width: 1240px;
    margin: 0 auto;
    padding: clamp(48px, 8vh, 96px) clamp(16px, 5vw, 64px);
    border-top: 2px solid var(--text);
    display: grid;
    grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
    gap: clamp(20px, 5vw, 72px);
  }
  h2 {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(1.8rem, 3vw, 2.6rem);
    line-height: 0.95;
    text-transform: uppercase;
  }
  details { border-bottom: 1px solid var(--border); }
  details:first-child { border-top: 1px solid var(--border); }
  summary {
    cursor: pointer;
    list-style: none;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 0;
    min-height: 44px;
    font-weight: 700;
    font-size: 1.05rem;
  }
  summary::-webkit-details-marker { display: none; }
  summary::after {
    content: '+';
    font-family: 'JetBrains Mono', monospace;
    color: var(--accent);
  }
  details[open] summary::after { content: '−'; }
  details p { padding: 0 0 18px; color: var(--mid); line-height: 1.6; max-width: 60ch; }

  @media (max-width: 860px) {
    .sf { grid-template-columns: minmax(0, 1fr); }
  }
</style>
