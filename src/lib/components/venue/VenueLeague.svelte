<script>
  let { ranking, season } = $props();
</script>

{#if ranking.length}
  <ol class="vl">
    {#each ranking as p, i (i)}
      <li class:top={i < 3}>
        <span class="vl-r">{String(i + 1).padStart(2, '0')}</span>
        <span class="vl-n">{p.name}</span>
        <span class="vl-s">{p.nights} soirée{p.nights > 1 ? 's' : ''}{p.wins ? ` · ${p.wins} victoire${p.wins > 1 ? 's' : ''}` : ''}</span>
        <span class="vl-p">{p.points}</span>
      </li>
    {/each}
  </ol>
{:else}
  <p>Personne n'a encore marqué de points en {season}. La première soirée du mois ouvre le classement.</p>
{/if}

<style>
  .vl { list-style: none; padding: 0; margin: 0; }
  .vl li {
    display: grid;
    grid-template-columns: 36px 1fr auto auto;
    gap: 12px;
    align-items: baseline;
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
  }
  .vl-r { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 0.8rem; color: var(--dim); }
  .vl .top .vl-r { color: var(--accent); }
  .vl-n { font-weight: 700; color: var(--text); overflow-wrap: anywhere; }
  .vl-s { font-size: 0.78rem; color: var(--dim); }
  .vl-p { font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 1.3rem; color: var(--text); min-width: 48px; text-align: right; }
  @media (max-width: 600px) {
    .vl li { grid-template-columns: 30px 1fr auto; }
    .vl-s { grid-column: 2; grid-row: 2; }
  }
</style>
