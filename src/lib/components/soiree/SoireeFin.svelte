<!-- Questions puis appel final -->
<script>
  import Faq from '#lib/components/ui/Faq.svelte';
  import { CREER, FAQ } from '#lib/components/soiree/soireeContent.js';
</script>

<section id="faq" class="faq" data-bg="calme" aria-labelledby="faq-t">
  <div class="wrap">
    <div class="head rv"><span class="label"><i></i>Questions</span><h2 class="grad" id="faq-t">Avant de vous lancer</h2></div>
    <Faq items={FAQ} />
  </div>
</section>

<section id="fin" class="final" data-bg="final" aria-labelledby="fin-t">
  <div class="wrap">
    <h2 class="fill" id="fin-t">Votre prochaine soirée commence ici</h2>
    <p>Ouvrez ZIK sur l'ordinateur relié à la TV. Vos invités n'ont qu'à sortir leur téléphone.</p>
    <div class="ctas">
      <a class="btn-main" href={CREER}>Créer une soirée</a>
      <a class="btn-line" href="#offres">Voir ZIK Pro</a>
    </div>
  </div>
</section>

<style>
  .faq { background: var(--bg2); }
  .final { text-align: center; padding-block: 120px 100px; }
  h2 { font-weight: 900; font-size: clamp(3rem, 13vw, 7.4rem); }
  .final p { color: #d8d9e6; margin: 18px auto 0; max-width: 30em; }
  .ctas { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 28px; }
  @property --soiree-fill { syntax: '<percentage>'; inherits: false; initial-value: 100%; }
  .fill { background: linear-gradient(90deg, #fff var(--soiree-fill), rgba(255, 255, 255, 0.18) 0); -webkit-background-clip: text; background-clip: text; color: transparent; }
  @supports (animation-timeline: view()) {
    .fill { animation: fill linear both; animation-timeline: view(); animation-range: entry 30% cover 50%; }
    @keyframes fill { from { --soiree-fill: 0%; } to { --soiree-fill: 100%; } }
  }
  @media (min-width: 900px) {
    .faq .wrap { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 64px; align-items: start; }
  }
</style>
