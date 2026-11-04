<script>
  /** Incidents des 30 derniers jours ; null = historique illisible, rien à affirmer. */
  let { incidents } = $props();

  const date = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });

  function duree(debut, fin) {
    const min = Math.max(1, Math.round((Date.parse(fin) - Date.parse(debut)) / 60000));
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    return min % 60 ? `${h} h ${min % 60} min` : `${h} h`;
  }
</script>

{#if incidents}
  <section class="il">
    <h2>Incidents récents</h2>
    {#if incidents.length}
      <ul>
        {#each incidents as i (`${i.probe}${i.startedAt}`)}
          <li>
            <b>{i.label}</b>
            <span>
              {date.format(new Date(i.startedAt))}
              · {i.endedAt ? `résolu en ${duree(i.startedAt, i.endedAt)}` : 'en cours'}
            </span>
          </li>
        {/each}
      </ul>
    {:else}
      <p>Aucun incident sur les 30 derniers jours.</p>
    {/if}
  </section>
{/if}

<style>
  .il { margin-bottom: 24px; }
  h2 {
    margin: 0 0 10px;
    font-size: 1.15rem;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 4px 14px;
    padding: 10px 0;
    border-top: 1px solid var(--border);
  }
  span,
  p {
    margin: 0;
    color: var(--mid);
    font-size: 0.9rem;
  }
</style>
