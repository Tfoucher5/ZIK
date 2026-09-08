<script>
  let { users = [] } = $props();

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
</script>

<div class="risk">
  <h2>Joueurs à récupérer</h2>
  <p class="intro">
    Dernière activité entre 14 et 30 jours, triés par nombre de jours joués :
    ceux du haut avaient le plus pris l'habitude.
  </p>

  {#if users.length === 0}
    <p class="empty">Personne dans cette fenêtre.</p>
  {:else}
    <ul>
      {#each users as u (u.id)}
        <li>
          <a href="/admin/users/{u.id}">{u.username}</a>
          <span class="days">{u.activeDays} jours joués</span>
          <span class="last">vu le {fmtDate(u.lastActive)} · il y a {u.daysSince} j</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .risk {
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
    margin: 6px 0 12px;
    max-width: 60ch;
  }
  ul {
    display: flex;
    flex-direction: column;
    max-height: 320px;
    overflow-y: auto;
  }
  li {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-top: 1px solid var(--adm-border);
    font-size: 0.78rem;
  }
  a {
    color: var(--adm-text);
    text-decoration: none;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  a:hover { color: var(--adm-accent); }
  .days {
    font-family: 'JetBrains Mono', monospace;
    color: var(--adm-text);
  }
  .last {
    font-size: 0.68rem;
    color: var(--adm-muted);
    white-space: nowrap;
  }
  .empty {
    font-size: 0.72rem;
    color: var(--adm-muted);
  }
</style>
