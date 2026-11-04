<script>
  /** Chiffres clés de /statut. Une donnée manquante ne s'affiche pas. */
  let { status } = $props();

  const probes = $derived(status.groups.flatMap((g) => g.probes));
  const mesurees = $derived(probes.filter((p) => p.level));
  const ok = $derived(mesurees.filter((p) => p.level === 'ok').length);
  const site = $derived(probes.find((p) => p.id === 'site')?.ms ?? null);
  const heure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });

  const tuiles = $derived(
    [
      status.availability !== null && { valeur: `${status.availability.toLocaleString('fr-FR')} %`, label: 'Disponibilité sur 30 jours' },
      mesurees.length > 0 && { valeur: `${ok}/${mesurees.length}`, label: 'Services opérationnels' },
      status.incidents && { valeur: status.incidents.length, label: status.incidents.length > 1 ? 'Incidents récents' : 'Incident récent' },
      site !== null && { valeur: `${site} ms`, label: 'Temps de réponse du site' },
      status.checkedAt && { valeur: heure.format(status.checkedAt), label: 'Dernière vérification' },
    ].filter(Boolean),
  );
</script>

{#if tuiles.length}
  <dl class="st-tuiles">
    {#each tuiles as t (t.label)}
      <div class="st-tuile">
        <dd>{t.valeur}</dd>
        <dt>{t.label}</dt>
      </div>
    {/each}
  </dl>
{/if}

<style>
  .st-tuiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
    margin: 0 0 32px;
  }
  .st-tuile {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
  }
  dd {
    margin: 0;
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 1.8rem;
    line-height: 1;
  }
  dt {
    color: var(--mid);
    font-size: 0.85rem;
  }
</style>
