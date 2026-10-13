<script>
  let { ranking, season } = $props();

  // Podium dans l'ordre visuel 2, 1, 3
  let podium = $derived([ranking[1], ranking[0], ranking[2]].map((p, i) => p && { ...p, rank: [2, 1, 3][i] }));
  let rest = $derived(ranking.slice(3));

  const detail = (p) => `${p.nights} soirée${p.nights > 1 ? 's' : ''}${p.wins ? ` · ${p.wins} victoire${p.wins > 1 ? 's' : ''}` : ''}`;
</script>

{#if ranking.length}
  <ol class="vl-podium">
    {#each podium as p, i (i)}
      {#if p}
        <li class="r{p.rank}">
          <span class="vl-name">{p.name}</span>
          <span class="vl-pts">{p.points} pts</span>
          <div class="vl-step"><b>{p.rank}</b><small>{detail(p)}</small></div>
        </li>
      {:else}
        <li class="vl-ghost" aria-hidden="true"></li>
      {/if}
    {/each}
  </ol>

  {#if rest.length}
    <ol class="vl" start="4">
      {#each rest as p, i (i)}
        <li>
          <span class="vl-r">{i + 4}</span>
          <span class="vl-n">{p.name}<small>{detail(p)}</small></span>
          <span class="vl-p">{p.points}</span>
        </li>
      {/each}
    </ol>
  {/if}
{:else}
  <p class="vn-empty">Personne n'a encore marqué de points en {season}. La première soirée du mois ouvre le classement.</p>
{/if}

<style>
  .vl-podium {
    list-style: none;
    padding: 0;
    margin: 0 0 18px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    align-items: end;
  }
  .vl-podium li { display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; min-width: 0; }
  .vl-name { font-weight: 800; color: var(--text); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .vl-pts { font-size: 0.8rem; font-weight: 700; color: var(--mid); }
  .vl-step {
    width: 100%;
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 4px;
    padding: 12px 6px;
    border-radius: 12px 12px 4px 4px;
    background: rgb(var(--accent-rgb) / 0.12);
    color: var(--accent);
  }
  .r1 .vl-step { height: 120px; background: var(--accent); color: var(--on-accent); }
  .r2 .vl-step { height: 92px; }
  .r3 .vl-step { height: 72px; }
  .vl-step b { font-family: "Barlow Condensed", sans-serif; font-size: 2rem; font-weight: 900; line-height: 1; }
  .vl-step small { font-size: 0.68rem; font-weight: 600; opacity: 0.85; }
  .r3 .vl-step small { display: none; }

  .vl { list-style: none; padding: 0; margin: 0; }
  .vl li {
    display: grid;
    grid-template-columns: 32px 1fr auto;
    gap: 12px;
    align-items: center;
    padding: 10px 4px;
    border-top: 1px solid var(--border);
  }
  .vl-r { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 0.8rem; color: var(--dim); text-align: center; }
  .vl-n { display: flex; flex-direction: column; font-weight: 700; color: var(--text); overflow-wrap: anywhere; }
  .vl-n small { font-size: 0.74rem; font-weight: 500; color: var(--dim); }
  .vl-p { font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 1.25rem; color: var(--text); }
</style>
