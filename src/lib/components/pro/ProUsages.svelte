<script>
  import ProSection from './ProSection.svelte';
  import { USAGES } from './proContent.js';
</script>

<ProSection title="À qui ça sert">
  <div class="pro-grid">
    {#each USAGES as u (u.titre)}
      <div class="pro-card">
        <h3>{u.titre}</h3>
        <p>{u.texte}</p>
      </div>
    {/each}
  </div>
</ProSection>

<style>
  .pro-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 14px;
  }
  .pro-card {
    background: rgb(var(--c-glass) / 0.04);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 18px;
  }
  .pro-card h3 {
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--text);
    margin-bottom: 8px;
  }
  :global(.pro-section) .pro-card p {
    margin-bottom: 0;
  }
</style>
