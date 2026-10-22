<script>
  import { PRO_PERKS, PRO_COMING } from '$lib/data/proPlans.js';
  import { TRUST } from './proContent.js';
</script>

<div class="pro-included">
  <h3>Inclus dans toutes les formules</h3>
  <ul>{#each PRO_PERKS as c (c)}<li>{c}</li>{/each}</ul>
</div>

<ul class="pro-trust">
  {#each TRUST as [titre, texte] (titre)}<li><b>{titre}</b> {texte}</li>{/each}
</ul>
<p class="pro-legal-note">
  Prix en euros, TVA non applicable. En payant, vous acceptez les
  <a href="/cgv">conditions générales de vente</a>. Un compte ZIK gratuit
  est nécessaire pour rattacher ZIK Pro à vos salons.
</p>

<div class="pro-coming">
  <h3>Bientôt dans ZIK Pro</h3>
  <ul>{#each PRO_COMING as c (c)}<li>{c}</li>{/each}</ul>
</div>

<style>
  .pro-included {
    margin-top: 28px;
  }
  .pro-included h3,
  .pro-coming h3 {
    margin-bottom: 10px;
  }
  :global(.pro-section) .pro-included ul {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 8px 20px;
  }
  :global(.pro-section) ul.pro-trust {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 20px;
  }
  :global(.pro-section) ul.pro-trust li {
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: 12px;
    font-size: 0.82rem;
  }
  :global(.pro-section) ul.pro-trust li::before {
    content: none;
  }
  .pro-trust b {
    display: block;
    color: var(--text);
  }
  :global(.pro-section) .pro-legal-note {
    font-size: 0.8rem;
    color: var(--dim);
  }
  .pro-coming {
    margin-top: 24px;
  }
  @media (max-width: 760px) {
    :global(.pro-section) ul.pro-trust {
      grid-template-columns: 1fr;
    }
  }
</style>
