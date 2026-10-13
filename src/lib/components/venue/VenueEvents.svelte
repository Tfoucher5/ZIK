<script>
  let { events, schedule = null } = $props();

  const fmt = (d) => new Date(d).toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  });
</script>

{#if schedule}<p class="ve-schedule">{schedule}</p>{/if}
{#if events.length}
  <ul class="ve">
    {#each events as e (e.id)}
      <li><b>{fmt(e.starts_at)}</b>{#if e.theme}<span>{e.theme}</span>{/if}</li>
    {/each}
  </ul>
{:else if !schedule}
  <p>Pas de date annoncée pour l'instant.</p>
{/if}

<style>
  .ve-schedule { font-family: "Barlow Condensed", sans-serif; font-weight: 800; font-size: 1.5rem; text-transform: uppercase; color: var(--text); margin-bottom: 12px; }
  .ve { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .ve li { display: flex; flex-wrap: wrap; gap: 4px 14px; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .ve b { color: var(--text); }
  .ve b::first-letter { text-transform: uppercase; }
  .ve span { color: var(--mid); }
</style>
