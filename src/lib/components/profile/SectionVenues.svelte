<script>
  import NotifyPrompt from '$lib/components/notify/NotifyPrompt.svelte';
  import { eventWhen } from '$lib/venues.js';

  let { sb } = $props();
  let venues = $state(null);

  $effect(() => {
    sb.auth.getSession().then(async ({ data: { session } }) => {
      const res = await fetch('/api/venue/follow', { headers: { Authorization: `Bearer ${session?.access_token}` } });
      venues = res.ok ? (await res.json()).venues : [];
    });
  });
</script>

{#if venues?.length}
  <NotifyPrompt
    categories={['venues']}
    title="Ne rate aucune soirée"
    text="Prévenu sur ton téléphone dès qu'un de tes lieux annonce un blind test, et le jour J."
  />
  <ul class="sv">
    {#each venues as v (v.slug)}
      <li style={v.color ? `--vc:${v.color}` : ''}>
        <a href="/lieu/{v.slug}">
          <span class="sv-name"><b>{v.name}</b><small>{v.city}</small></span>
          <span class="sv-next">
            {#if v.next}Prochaine soirée : <b>{eventWhen(v.next.starts_at)}</b>{#if v.next.theme} · {v.next.theme}{/if}
            {:else}Pas de date annoncée{/if}
          </span>
        </a>
      </li>
    {/each}
  </ul>
{:else if venues}
  <p class="sv-empty">
    Tu ne suis aucun lieu. Les bars et lieux qui organisent leurs soirées avec ZIK te préviennent
    de leurs prochains blind tests : <a href="/lieux">trouve ceux près de chez toi</a>.
  </p>
{/if}

<style>
  .sv { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
  .sv a {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 18px;
    padding: 14px 16px;
    border: 1px solid var(--border);
    border-left: 4px solid var(--vc, var(--accent));
    border-radius: 12px;
    background: var(--surface);
    color: var(--text);
    text-decoration: none;
  }
  .sv a:hover { border-color: var(--vc, var(--accent)); }
  .sv-name { display: flex; flex-direction: column; }
  .sv-name small { font-size: 0.78rem; color: var(--dim); }
  .sv-next { font-size: 0.85rem; color: var(--mid); }
  .sv-next b { color: var(--text); }
  .sv-empty { font-size: 0.9rem; line-height: 1.6; color: var(--mid); }
  .sv-empty a { color: var(--accent); }
</style>
