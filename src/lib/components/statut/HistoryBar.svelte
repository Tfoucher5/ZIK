<script>
  /** Barre des 30 derniers jours : un carré par jour, coloré selon la durée des incidents. */
  let { days = [], levels = [], minutes = null } = $props();

  const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
  const jour = (d) => fmt.format(new Date(`${d}T12:00:00Z`));
  const duree = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, '0')}` : ''}`);
  function texte(i) {
    const level = levels[i];
    if (!level) return 'pas de données';
    if (level === 'ok') return 'aucun incident';
    return minutes ? `${duree(minutes[i])} d'incident` : level === 'incident' ? 'incident' : 'perturbations';
  }
</script>

<ol class="hb" aria-label="Historique des 30 derniers jours">
  {#each days as d, i (d)}
    <li class="hb-day {levels[i] ?? 'none'}" title="{jour(d)} : {texte(i)}">
      <span class="sr">{jour(d)} : {texte(i)}</span>
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
  /* Jaune et orange tirés de --warn vers --success et --danger : 4 teintes distinctes dans les deux thèmes */
  .hb-day.minor,
  .hb-day.suspect { background: color-mix(in oklch, var(--warn), var(--success) 25%); }
  .hb-day.major { background: color-mix(in oklch, var(--warn), var(--danger) 45%); }
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
