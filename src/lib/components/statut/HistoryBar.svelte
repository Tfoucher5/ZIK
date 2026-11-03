<script>
  /** Barre des 30 derniers jours : un carré par jour, pire niveau du jour. */
  let { days = [], levels = [] } = $props();

  const TEXT = { ok: 'aucun problème', suspect: 'perturbations', incident: 'incident' };
  const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
  const jour = (d) => fmt.format(new Date(`${d}T12:00:00Z`));
</script>

<ol class="hb" aria-label="Historique des 30 derniers jours">
  {#each days as d, i (d)}
    <li class="hb-day {levels[i] ?? 'none'}" title="{jour(d)} : {TEXT[levels[i]] ?? 'pas de données'}">
      <span class="sr">{jour(d)} : {TEXT[levels[i]] ?? 'pas de données'}</span>
    </li>
  {/each}
</ol>

<style>
  .hb {
    display: grid;
    grid-template-columns: repeat(30, 1fr);
    gap: 3px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .hb-day {
    height: 28px;
    border-radius: 3px;
    background: var(--border);
  }
  .hb-day.ok { background: var(--success); }
  .hb-day.suspect { background: var(--warn); }
  .hb-day.incident { background: var(--danger); }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
  @media (max-width: 480px) {
    .hb { gap: 2px; }
    .hb-day { height: 22px; }
  }
</style>
