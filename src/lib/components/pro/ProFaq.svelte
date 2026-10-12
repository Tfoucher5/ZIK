<script>
  import ProSection from './ProSection.svelte';
  import { FAQ } from './proContent.js';
</script>

<ProSection title="Questions fréquentes">
  <dl class="pro-faq">
    {#each FAQ as [q, r] (q)}
      <dt>{q}</dt>
      <dd>{r}</dd>
    {/each}
  </dl>
</ProSection>

<style>
  .pro-faq dt {
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--text);
    margin-top: 16px;
  }
  .pro-faq dt:first-child {
    margin-top: 0;
  }
  .pro-faq dd {
    margin: 6px 0 0;
    font-size: 0.9rem;
    color: var(--mid);
    line-height: 1.7;
  }
</style>
