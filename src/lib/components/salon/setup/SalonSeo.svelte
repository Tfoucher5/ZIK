<script>
  import { FAQ_GROUPS, STEPS, OCCASIONS } from './salonSetupSeo.js';
</script>

<section class="st-seo" aria-labelledby="st-seo-title">
  <h2 id="st-seo-title">Le blind test de soirée, sans animateur</h2>

  <div class="st-seo-grid">
    <div>
      <h3>Comment ça marche</h3>
      <ol class="st-steps">
        {#each STEPS as [head, rest], i (head)}
          <li><span>{String(i + 1).padStart(2, '0')}</span><p><b>{head}</b> {rest}</p></li>
        {/each}
      </ol>
    </div>
    <div>
      <h3>Pour chaque occasion</h3>
      <ul class="st-occasions">
        {#each OCCASIONS as [slug, label] (slug)}
          <li><a href="/blind-test/{slug}">{label}</a></li>
        {/each}
        <li><a href="/blind-test">Tous les thèmes</a></li>
      </ul>
    </div>
  </div>

  <h3>Questions fréquentes</h3>
  <div class="st-faq">
    {#each FAQ_GROUPS as g (g.title)}
      <div class="st-faq-group">
        <p class="st-faq-title">{g.title}</p>
        {#each g.items as { q, a } (q)}
          <details>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        {/each}
      </div>
    {/each}
  </div>
</section>

<style>
  .st-seo {
    margin-top: 56px;
    padding-top: 36px;
    border-top: 2px solid var(--text);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .st-seo h2 {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 1.8rem;
    text-transform: uppercase;
  }
  .st-seo h3 {
    margin: 14px 0 10px;
    font-family: var(--s-mono);
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--mid);
  }
  .st-seo-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 40px;
  }
  .st-steps { display: flex; flex-direction: column; gap: 12px; list-style: none; }
  .st-steps li { display: flex; gap: 14px; }
  .st-steps span { font-family: var(--s-mono); font-size: 0.8rem; color: var(--accent); padding-top: 2px; }
  .st-steps p { font-size: 0.92rem; color: var(--mid); line-height: 1.55; }
  .st-steps b { color: var(--text); font-weight: 600; }
  .st-occasions { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; }
  .st-occasions a {
    display: inline-block;
    padding: 7px 12px;
    border: 1px solid var(--border2);
    border-radius: 3px;
    font-size: 0.88rem;
    color: var(--text);
    text-decoration: none;
  }
  .st-occasions a:hover { border-color: var(--text); }

  .st-faq {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 24px;
    align-items: start;
  }
  .st-faq-title {
    padding-bottom: 8px;
    border-bottom: 2px solid var(--text);
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 1.1rem;
    text-transform: uppercase;
  }
  .st-faq details { border-bottom: 1px solid var(--border); }
  .st-faq summary {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
    font-size: 0.92rem;
    font-weight: 600;
    cursor: pointer;
    list-style: none;
  }
  .st-faq summary::-webkit-details-marker { display: none; }
  .st-faq summary::after {
    content: '+';
    flex: none;
    font-family: var(--s-mono);
    color: var(--accent);
    transition: transform 0.2s;
  }
  .st-faq details[open] summary::after { transform: rotate(45deg); }
  .st-faq summary:hover { color: var(--accent); }
  .st-faq details p {
    padding: 0 0 14px;
    font-size: 0.9rem;
    color: var(--mid);
    line-height: 1.6;
  }

  @media (max-width: 760px) {
    .st-seo-grid, .st-faq { grid-template-columns: 1fr; gap: 24px; }
  }
</style>
