<script>
  import HistoryBar from './HistoryBar.svelte';
  import { LEVEL_TEXT } from '$lib/shared/health/levels.js';

  /** Un grand service de /statut : son état, sa frise et le détail de ses sondes. */
  let { group, days, checked, historyAvailable } = $props();
</script>

<section class="sg">
  <header class="sg-tete">
    <h2>{group.label}</h2>
    {#if group.availability !== null}<span class="sg-dispo">{group.availability.toLocaleString('fr-FR')} % sur 30 jours</span>{/if}
    {#if checked}<span class="sg-etat {group.level}"><i aria-hidden="true"></i>{LEVEL_TEXT[group.level]}</span>{/if}
  </header>

  {#if historyAvailable}<HistoryBar {days} levels={group.history} />{/if}

  <ul class="sg-sondes">
    {#each group.probes as p (p.id)}
      <li>
        <span class="sg-nom">{p.label}</span>
        {#if p.ms !== null}<span class="sg-ms">{p.ms} ms</span>{/if}
        {#if p.level}
          <span class="sg-etat petit {p.level}"><i aria-hidden="true"></i>{LEVEL_TEXT[p.level]}</span>
        {:else}
          <span class="sg-etat petit attente">Pas encore mesuré</span>
        {/if}
      </li>
    {/each}
  </ul>
</section>

<style>
  .sg {
    display: grid;
    gap: 14px;
    padding: 18px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
  }
  .sg-tete {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px 14px;
  }
  .sg-tete h2 {
    flex: 1 1 200px;
    margin: 0;
    font-size: 1.15rem;
  }
  .sg-dispo,
  .sg-ms {
    color: var(--mid);
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
  }
  .sg-etat {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  }
  .sg-etat i {
    flex: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--success);
  }
  .sg-etat.suspect i { background: var(--warn); }
  .sg-etat.incident i { background: var(--danger); }
  .sg-etat.petit {
    font-size: 0.85rem;
    font-weight: 500;
  }
  .sg-etat.attente { color: var(--mid); }
  .sg-sondes {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .sg-sondes li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 14px;
    padding: 9px 0;
    border-top: 1px solid var(--border);
  }
  .sg-nom { flex: 1 1 180px; }
</style>
