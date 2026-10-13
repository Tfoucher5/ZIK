<script>
  import VenueEvents from './VenueEvents.svelte';

  let { admin } = $props();
  let startsAt = $state('');
  let theme = $state('');

  async function add(e) {
    e.preventDefault();
    await admin.addEvent(startsAt, theme);
    if (!admin.error) { startsAt = ''; theme = ''; }
  }
</script>

<VenueEvents events={admin.events} />
{#if admin.events.length}
  <ul class="ve-del">
    {#each admin.events as ev (ev.id)}
      <li><button onclick={() => admin.removeEvent(ev.id)} disabled={admin.busy}>Retirer la soirée du {new Date(ev.starts_at).toLocaleDateString('fr-FR')}</button></li>
    {/each}
  </ul>
{/if}

<form class="ve-add" onsubmit={add}>
  <input type="datetime-local" bind:value={startsAt} required aria-label="Date et heure" />
  <input bind:value={theme} maxlength="60" placeholder="Thème (facultatif) : années 80, rap…" aria-label="Thème" />
  <button disabled={admin.busy || !startsAt}>Ajouter la soirée</button>
</form>

<style>
  .ve-del { list-style: none; padding: 0; margin: 8px 0 0; display: flex; flex-wrap: wrap; gap: 4px 14px; }
  .ve-del button { background: none; border: 0; padding: 0; color: var(--dim); text-decoration: underline; cursor: pointer; font: inherit; font-size: 0.8rem; }
  .ve-add { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
  .ve-add input {
    flex: 1 1 200px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: rgb(var(--c-glass) / 0.04);
    color: var(--text);
    font: inherit;
  }
  .ve-add button { padding: 10px 18px; border: 2px solid var(--text); border-radius: 3px; background: none; color: var(--text); font: inherit; font-weight: 700; cursor: pointer; }
  .ve-add button:disabled { opacity: 0.4; }
</style>
