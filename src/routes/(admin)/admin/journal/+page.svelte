<script>
  import PageHeader from '$lib/admin/PageHeader.svelte';

  let { data } = $props();

  const KINDS = [
    { key: 'all', label: 'Tout' },
    { key: 'signup', label: 'Inscriptions' },
    { key: 'pro', label: 'Pro' },
    { key: 'salon', label: 'Salons' },
    { key: 'issue', label: 'Problèmes' },
    { key: 'report', label: 'Messages' },
    { key: 'prospect', label: 'Prospects' },
  ];
  const ICON = { signup: '👋', pro: '⭐', pro_bad: '⚠️', salon: '📺', report: '✉️', issue: '🔧', prospect: '📨' };

  let kind = $state('all');

  const days = $derived.by(() => {
    const groups = [];
    for (const e of data.events) {
      if (kind !== 'all' && e.kind !== kind && !(kind === 'pro' && e.kind === 'pro_bad')) continue;
      const day = new Date(e.ts).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      if (groups.at(-1)?.day !== day) groups.push({ day, events: [] });
      groups.at(-1).events.push(e);
    }
    return groups;
  });
  const hour = (ts) => new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
</script>

<div class="adm-page">
  <PageHeader title="Journal">
    <div class="a-chips">
      <a class="a-chip" aria-current={data.days === 7 ? "page" : undefined} href="?j=7">7 j</a>
      <a class="a-chip" aria-current={data.days === 30 ? "page" : undefined} href="?j=30">30 j</a>
    </div>
  </PageHeader>

  <div class="a-stack">
    <div class="a-chips" role="group" aria-label="Type d'événement">
      {#each KINDS as k (k.key)}
        <button class="a-chip" aria-pressed={kind === k.key} onclick={() => (kind = k.key)}>{k.label}</button>
      {/each}
    </div>

    {#each days as g (g.day)}
      <section>
        <h2 class="a-h2">{g.day}</h2>
        <ol class="tl">
          {#each g.events as e, i (i)}
            <li>
              <a href={e.href}>
                <span class="ts">{hour(e.ts)}</span>
                <span class="ico" aria-hidden="true">{ICON[e.kind]}</span>
                <span class="txt">{e.text}</span>
              </a>
            </li>
          {/each}
        </ol>
      </section>
    {:else}
      <p class="a-empty">Rien sur cette période.</p>
    {/each}
  </div>
</div>

<style>
  .tl { position: relative; display: grid; gap: 2px; margin-top: 8px; list-style: none; }
  .tl::before { content: ''; position: absolute; top: 6px; bottom: 6px; left: 63px; width: 2px; background: var(--a-line); }
  .tl a { position: relative; display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; font-size: 0.9rem; }
  .ts { flex: 0 0 44px; padding-top: 2px; font-size: 0.75rem; color: var(--a-dim); font-variant-numeric: tabular-nums; }
  .ico { position: relative; z-index: 1; flex: 0 0 24px; height: 24px; display: grid; place-items: center; border-radius: 50%; background: var(--a-surface2); font-size: 0.75rem; }
  .txt { flex: 1; min-width: 0; padding-top: 2px; }
  .tl a:hover .txt { color: var(--a-accent); }
</style>
