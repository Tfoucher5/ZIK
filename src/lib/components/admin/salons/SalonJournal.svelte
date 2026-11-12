<script>
  /** Ce qui s'est passé dans le salon et les titres déjà joués. */
  let { s } = $props();

  const time = (ms) => new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
</script>

<section class="a-card block">
  <h3>Journal</h3>
  <ul class="a-list">
    {#each s.journal as e, i (i)}
      <li class="line"><span class="a-muted at">{time(e.at)}</span><span>{e.text}</span></li>
    {:else}
      <li class="a-empty">Rien à signaler depuis l'ouverture ou le dernier redémarrage.</li>
    {/each}
  </ul>
</section>

{#if s.history.length}
  <section class="a-card block">
    <h3>Titres joués ({s.history.length})</h3>
    <ol class="played">
      {#each s.history as answer, i (i)}
        <li>{answer}</li>
      {/each}
    </ol>
  </section>
{/if}

<style>
  .block { display: grid; gap: 10px; min-width: 0; }
  h3 { font-size: 0.8rem; font-weight: 700; color: var(--a-dim); text-transform: uppercase; letter-spacing: 0.04em; }
  .line { display: flex; gap: 10px; font-size: 0.88rem; overflow-wrap: anywhere; }
  .at { flex: none; font-variant-numeric: tabular-nums; }
  .played { padding-left: 1.6em; display: grid; gap: 4px; font-size: 0.88rem; overflow-wrap: anywhere; }
</style>
