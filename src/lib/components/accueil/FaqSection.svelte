<!-- Questions fréquentes : les mêmes que dans les données structurées (faqJsonLd) -->
<script>
  import Faq from '#lib/components/ui/Faq.svelte';
  import { FAQ } from '#lib/components/accueil/guide.js';
</script>

<section class="collee" aria-labelledby="t-faq">
  <div class="acc-wrap">
    <div class="acc-head"><h2 id="t-faq" class="grad">Questions fréquentes</h2></div>
    <Faq items={FAQ} />
  </div>
</section>

<style>
  h2 {
    font-weight: 900;
    font-size: clamp(2rem, 8vw, 3.4rem);
  }
</style>
