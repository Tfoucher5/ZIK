<script>
  import ProSection from './ProSection.svelte';
  import { ETAPES } from './proContent.js';
</script>

<ProSection title="Comment ça se passe">
  <ol class="pro-steps">
    {#each ETAPES as e (e.n)}
      <li>
        <span class="pro-step-n">{e.n}</span>
        <div>
          <h3>{e.titre}</h3>
          <p>{e.texte}</p>
        </div>
      </li>
    {/each}
  </ol>
</ProSection>

<style>
  .pro-steps {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .pro-steps li {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }
  .pro-step-n {
    flex: 0 0 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--accent);
    background: rgb(var(--accent-rgb) / 0.12);
    border: 1px solid rgb(var(--accent-rgb) / 0.3);
  }
  .pro-steps h3 {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 4px;
  }
  :global(.pro-section) .pro-steps p {
    margin-bottom: 0;
  }
</style>
