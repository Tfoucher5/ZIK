<script>
  let { cohorts = {} } = $props();

  const TABS = [
    { key: 'blindtest', label: 'Blind test' },
    { key: 'zikle', label: 'Zikle' },
    { key: 'defi', label: 'Défi hebdo' },
  ];

  let activity = $state('blindtest');
  const rows = $derived(cohorts[activity] ?? []);

  const fmtWeek = (d) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  // Opacité proportionnelle au taux : une case forte se voit, une case
  // non significative reste plate pour ne pas attirer l'oeil à tort.
  const cellStyle = (c) =>
    !c || !c.significant
      ? ''
      : `background: rgba(99, 102, 241, ${(0.08 + (c.pct / 100) * 0.55).toFixed(3)})`;
</script>

<div class="cohort">
  <div class="head">
    <h2>Rétention par cohorte d'inscription</h2>
    <div class="tabs">
      {#each TABS as t (t.key)}
        <button class:on={activity === t.key} onclick={() => (activity = t.key)}>
          {t.label}
        </button>
      {/each}
    </div>
  </div>

  {#if rows.length === 0}
    <p class="empty">Aucune cohorte sur la période.</p>
  {:else}
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th class="wk">Semaine</th>
            <th class="n">Inscrits</th>
            <th>S+1</th>
            <th>S+2</th>
            <th>S+3</th>
            <th>S+4</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.week)}
            <tr>
              <td class="wk">{fmtWeek(row.week)}</td>
              <td class="n">{row.size}</td>
              {#each row.cells as cell, i (i)}
                <td class="cell" class:weak={cell && !cell.significant} style={cellStyle(cell)}>
                  {#if cell}
                    <span class="pct">{cell.pct} %</span>
                    <span class="frac">{cell.retained}/{cell.total}</span>
                  {:else}
                    <span class="frac">—</span>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="note">
      Cases grisées : cohorte de moins de 20 inscrits, le pourcentage n'est pas
      interprétable.
    </p>
  {/if}
</div>

<style>
  .cohort {
    background: var(--adm-panel);
    border: 1px solid var(--adm-border);
    border-radius: 10px;
    padding: 18px 20px;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }
  h2 {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--adm-text);
  }
  .tabs {
    display: flex;
    gap: 2px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--adm-border);
    border-radius: 8px;
    padding: 3px;
  }
  .tabs button {
    background: none;
    border: 0;
    color: var(--adm-muted);
    font: inherit;
    font-size: 0.75rem;
    padding: 5px 12px;
    border-radius: 6px;
    cursor: pointer;
  }
  .tabs button.on {
    background: var(--adm-accent);
    color: #fff;
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
  th.wk, td.wk { text-align: left; }
  td {
    text-align: center;
    padding: 7px 8px;
    border-top: 1px solid var(--adm-border);
    color: var(--adm-text);
  }
  td.wk, td.n {
    font-family: 'JetBrains Mono', monospace;
    color: var(--adm-muted);
    white-space: nowrap;
  }
  td.cell { border-radius: 4px; }
  td.cell.weak { opacity: 0.4; }
  .pct {
    display: block;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 600;
  }
  .frac {
    display: block;
    font-size: 0.66rem;
    color: var(--adm-muted);
  }
  .empty, .note {
    font-size: 0.72rem;
    color: var(--adm-muted);
    margin-top: 10px;
  }
</style>
