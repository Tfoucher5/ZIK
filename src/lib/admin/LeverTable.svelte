<script>
  let { levers = [] } = $props();

  const LABELS = {
    zikle: 'A joué au Zikle',
    multijoueur: 'A joué à plusieurs',
    succes: 'A débloqué un succès',
    social: 'A suivi quelqu’un ou contribué au défi',
  };
</script>

<div class="levers">
  <h2>Ce qui fait revenir</h2>
  <p class="intro">
    Parmi les inscrits d'il y a plus de 37 jours : part encore active entre J+7
    et J+37 selon ce qu'ils ont fait pendant leur première semaine.
  </p>

  {#if levers.length === 0}
    <p class="empty">Aucune donnée.</p>
  {:else}
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th class="lv">Première semaine</th>
            <th>Ont fait</th>
            <th>N'ont pas fait</th>
            <th>Écart</th>
          </tr>
        </thead>
        <tbody>
          {#each levers as l (l.lever)}
            <tr class:weak={!l.significant}>
              <td class="lv">{LABELS[l.lever] ?? l.lever}</td>
              <td>
                <span class="pct">{l.withPct} %</span>
                <span class="n">n = {l.withN}</span>
              </td>
              <td>
                <span class="pct">{l.withoutPct} %</span>
                <span class="n">n = {l.withoutN}</span>
              </td>
              <td>
                {#if l.significant}
                  <span class="delta" class:up={l.deltaPts > 0} class:down={l.deltaPts < 0}>
                    {l.deltaPts > 0 ? '+' : ''}{l.deltaPts} pts
                  </span>
                {:else}
                  <span class="n">échantillon insuffisant</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .levers {
    background: var(--adm-panel);
    border: 1px solid var(--adm-border);
    border-radius: 10px;
    padding: 18px 20px;
  }
  h2 {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--adm-text);
  }
  .intro {
    font-size: 0.72rem;
    color: var(--adm-muted);
    margin: 6px 0 14px;
    max-width: 60ch;
  }
  .scroll { overflow-x: auto; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.78rem;
  }
  th {
    text-align: center;
    font-weight: 500;
    font-size: 0.7rem;
    color: var(--adm-muted);
    padding: 6px 8px;
  }
  th.lv, td.lv { text-align: left; }
  td {
    text-align: center;
    padding: 9px 8px;
    border-top: 1px solid var(--adm-border);
    color: var(--adm-text);
  }
  tr.weak { opacity: 0.45; }
  .pct {
    display: block;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 600;
  }
  .n {
    display: block;
    font-size: 0.66rem;
    color: var(--adm-muted);
  }
  .delta {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 600;
    color: var(--adm-muted);
  }
  .delta.up { color: var(--adm-green); }
  .delta.down { color: var(--adm-red); }
  .empty {
    font-size: 0.72rem;
    color: var(--adm-muted);
  }
</style>
