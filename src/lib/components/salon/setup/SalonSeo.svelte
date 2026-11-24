<script>
  import Faq from '#lib/components/ui/Faq.svelte';
  import { FAQ_GROUPS, STEPS, OCCASIONS } from './salonSetupSeo.js';
</script>

<section class="seo" aria-labelledby="seo-titre">
  <h2 id="seo-titre" class="grad">Le blind test de soirée, sans animateur</h2>

  <div class="grille">
    <div>
      <h3>Comment ça marche</h3>
      <ol class="etapes">
        {#each STEPS as [head, rest], i (head)}
          <li><span>{String(i + 1).padStart(2, '0')}</span><p><b>{head}</b> {rest}</p></li>
        {/each}
      </ol>
    </div>
    <div>
      <h3>Pour chaque occasion</h3>
      <ul class="occasions">
        {#each OCCASIONS as [slug, label] (slug)}
          <li><a href="/blind-test/{slug}">{label}</a></li>
        {/each}
        <li><a href="/blind-test">Tous les thèmes</a></li>
      </ul>
    </div>
  </div>

  <h3>Questions fréquentes</h3>
  <div class="faq">
    {#each FAQ_GROUPS as g (g.title)}
      <div>
        <p class="faq-titre">{g.title}</p>
        <Faq items={g.items} />
      </div>
    {/each}
  </div>
</section>

<style>
  .seo {
    display: grid;
    gap: 16px;
    max-width: 1200px;
    margin: 0 auto;
    padding: 64px 20px 88px;
  }
  h2 { font-weight: 900; font-size: clamp(2.1rem, 9vw, 4rem); }
  h3 {
    margin: 14px 0 10px;
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .grille { display: grid; gap: 24px; }
  .etapes { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
  .etapes li { display: flex; gap: 14px; }
  .etapes span { padding-top: 2px; font-family: var(--mono); font-size: 13px; color: var(--muted); }
  .etapes p { font-size: 15px; line-height: 1.55; color: var(--muted); }
  .etapes b { font-weight: 600; color: var(--text); }
  .occasions { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
  .occasions a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 16px;
    border: 1px solid var(--line-2);
    border-radius: 999px;
    font-size: 15px;
    color: var(--text);
    text-decoration: none;
  }
  .occasions a:hover { background: rgba(255, 255, 255, 0.06); }
  .faq { display: grid; gap: 24px; align-items: start; }
  .faq-titre { padding-bottom: 8px; font-family: var(--titre); font-weight: 900; font-size: 1.3rem; text-transform: uppercase; }

  @media (min-width: 900px) {
    .seo { padding-block: 96px 130px; }
    .grille { grid-template-columns: 1.2fr 1fr; gap: 40px; }
    .faq { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
</style>
