<script>
  let { events, empty = "Pas de date annoncée pour l'instant.", actions = null } = $props();

  const part = (d, opts) => new Date(d).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', ...opts });
</script>

{#if events.length}
  <ul class="ve">
    {#each events as e, i (e.id)}
      <li class:next={i === 0}>
        <div class="ve-date">
          <b>{part(e.starts_at, { day: 'numeric' })}</b>
          <span>{part(e.starts_at, { month: 'short' }).replace('.', '')}</span>
        </div>
        <div class="ve-info">
          <p class="ve-when">{part(e.starts_at, { weekday: 'long' })} · {part(e.starts_at, { hour: '2-digit', minute: '2-digit' })}</p>
          <p class="ve-theme">{e.theme || 'Blind test tous styles'}</p>
        </div>
        {#if actions}{@render actions(e)}{:else if i === 0}<span class="ve-badge">Prochaine</span>{/if}
      </li>
    {/each}
  </ul>
{:else}
  <p class="vn-empty">{empty}</p>
{/if}

<style>
  .ve { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
  .ve li {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px 16px;
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--bg);
  }
  .ve li.next { border-color: rgb(var(--accent-rgb) / 0.5); }
  .ve-date {
    flex: 0 0 54px;
    height: 58px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: rgb(var(--accent-rgb) / 0.12);
    color: var(--accent);
    line-height: 1;
  }
  .next .ve-date { background: var(--accent); color: var(--on-accent); }
  .ve-date b { font-family: "Barlow Condensed", sans-serif; font-size: 1.6rem; font-weight: 900; }
  .ve-date span { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
  .ve-info { flex: 1; min-width: 130px; }
  .ve-when { font-size: 0.78rem; font-weight: 700; color: var(--mid); text-transform: capitalize; }
  .ve-theme { margin-top: 3px; font-size: 1rem; font-weight: 700; color: var(--text); overflow-wrap: anywhere; }
  .ve-badge {
    padding: 4px 10px;
    border-radius: 999px;
    background: rgb(var(--accent-rgb) / 0.12);
    color: var(--accent);
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  @media (max-width: 420px) {
    .ve-badge { display: none; }
  }
</style>
