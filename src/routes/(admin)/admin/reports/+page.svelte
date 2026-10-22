<script>
  import { untrack } from 'svelte';
  import { page } from '$app/state';
  import PageHeader from '$lib/components/admin/PageHeader.svelte';
  import Sheet from '$lib/components/admin/Sheet.svelte';
  import ReportReader from '$lib/components/admin/reports/ReportReader.svelte';
  import { ago } from '$lib/shared/admin/stats-utils.js';
  import { subjectLabel, isTrack, isSalon } from '$lib/shared/admin/reports.js';

  let { data, form } = $props();

  const STATES = [
    ['todo', 'À traiter'],
    ['done', 'Traités'],
    ['all', 'Tout'],
  ];
  const TYPES = [
    ['all', 'Tous'],
    ['titre', 'Titres'],
    ['salon', 'Salons'],
    ['bug', 'Bugs'],
    ['contact', 'Contacts'],
    ['user', 'Joueurs signalés'],
  ];

  const linked = untrack(() => data.reports.find((r) => r.id === page.url.searchParams.get('id')));
  let etat = $state(linked && linked.status !== 'pending' ? 'all' : (page.url.searchParams.get('etat') ?? 'todo'));
  let type = $state(page.url.searchParams.get('type') ?? 'all');
  let selId = $state(linked?.id ?? null);
  let isDesk = $state(false);
  let sheetOpen = $state(false);
  let busy = $state(false);

  const matchType = (r, t) =>
    t === 'all' ||
    (t === 'titre' ? isTrack(r) : t === 'salon' ? isSalon(r) : t === 'bug' ? r.type === 'bug' && !isTrack(r) && !isSalon(r) : r.type === t);
  const matchState = (r, s) => s === 'all' || (s === 'todo' ? r.status === 'pending' : r.status !== 'pending');

  const shown = $derived(data.reports.filter((r) => matchState(r, etat) && matchType(r, type)));
  const sel = $derived(data.reports.find((r) => r.id === selId) ?? null);
  const pending = $derived(data.reports.filter((r) => r.status === 'pending'));
  const week = $derived(data.reports.filter((r) => Date.now() - new Date(r.created_at) < 7 * 86400000).length);
  const typeCount = (t) => data.reports.filter((r) => matchState(r, etat) && matchType(r, t)).length;

  $effect(() => {
    const mq = matchMedia('(min-width: 1100px)');
    isDesk = mq.matches;
    if (isDesk && linked) sheetOpen = false;
    else if (linked) sheetOpen = true;
    const on = (e) => {
      isDesk = e.matches;
      if (isDesk) sheetOpen = false;
    };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  });

  $effect(() => {
    if (isDesk && shown.length && !shown.some((r) => r.id === selId)) pick(shown[0], false);
  });

  function pick(r, openSheet = true) {
    selId = r.id;
    if (openSheet && !isDesk) sheetOpen = true;
  }

  const submit = () => {
    busy = true;
    return async ({ result, update }) => {
      busy = false;
      await update({ reset: false });
      if (result.type === 'success' && !isDesk) sheetOpen = false;
    };
  };

  const who = (r) => r.reporter?.username ?? r.reporter_name ?? r.reporter_email ?? 'Anonyme';
</script>

{#snippet reader(r)}
  {#key r.id}<ReportReader {r} {busy} {submit} />{/key}
{/snippet}

<div class="adm-page">
  <PageHeader title="Messages" />

  <div class="a-stack">
    {#if form?.error}<p class="a-card bad a-err" role="alert">{form.error}</p>{/if}
    {#if form?.message}<p class="a-card good a-ok" role="status">{form.message}</p>{/if}
    {#if data.error}<p class="a-card bad a-err">{data.error}</p>{/if}

    <div class="a-kpis">
      <button class="a-kpi" class:hot={pending.length} onclick={() => { etat = 'todo'; type = 'all'; }}>
        <span class="a-kpi-label">À traiter</span><span class="a-kpi-value">{pending.length}</span><span class="a-kpi-sub">{pending.length ? `le plus ancien ${ago(pending.at(-1).created_at)}` : 'tout est lu'}</span>
      </button>
      <div class="a-kpi"><span class="a-kpi-label">Reçus</span><span class="a-kpi-value">{week}</span><span class="a-kpi-sub">sur 7 jours</span></div>
      <button class="a-kpi" onclick={() => { etat = 'todo'; type = 'titre'; }}>
        <span class="a-kpi-label">Titres signalés</span><span class="a-kpi-value">{pending.filter(isTrack).length}</span><span class="a-kpi-sub">à traiter</span>
      </button>
    </div>

    <div class="filters">
      <div class="a-chips" role="group" aria-label="État">
        {#each STATES as [k, label] (k)}
          <button class="a-chip" aria-pressed={etat === k} onclick={() => (etat = k)}>{label}{#if k === 'todo' && pending.length}<b>{pending.length}</b>{/if}</button>
        {/each}
      </div>
      <div class="a-chips" role="group" aria-label="Type">
        {#each TYPES as [k, label] (k)}
          {@const n = typeCount(k)}
          <button class="a-chip" aria-pressed={type === k} onclick={() => (type = k)}>{label}{#if n}<b>{n}</b>{/if}</button>
        {/each}
      </div>
    </div>

    <div class="a-cols inbox">
      <div>
        {#if shown.length}
          <ul class="a-list">
            {#each shown as r (r.id)}
              <li>
                <button class="a-row msg-row" class:prio={r.priority && r.status === 'pending'} class:on={isDesk && r.id === selId} class:unread={r.status === 'pending'} type="button" onclick={() => pick(r)} aria-current={isDesk && r.id === selId ? 'true' : undefined}>
                  <span class="dot" aria-hidden="true"></span>
                  <span class="a-row-main">
                    <span class="a-row-title">{who(r)}</span>
                    <span class="a-row-sub subj">{subjectLabel(r)}{r.room ? ` · ${r.room.name}` : ''}</span>
                    {#if r.message}<span class="a-row-sub">{r.message}</span>{/if}
                  </span>
                  <span class="right">
                    <span class="a-muted t">{ago(r.created_at)}</span>
                    {#if r.priority}<em class="a-tag accent">Pro</em>{/if}
                    {#if r.salonLive}<em class="a-tag good">En direct</em>{/if}
                    {#if r.tracks.some((t) => t.toFix)}<em class="a-tag warn">Titre</em>{/if}
                    {#if r.admin_reply}<em class="a-tag good">Répondu</em>{/if}
                  </span>
                </button>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="a-card a-empty">{etat === 'todo' ? 'Aucun message à traiter. Bravo !' : 'Aucun message ici.'}</p>
        {/if}
      </div>

      {#if isDesk}
        <div class="pane">
          {#if sel}
            <div class="a-section">{@render reader(sel)}</div>
          {:else}
            <p class="a-card a-empty">Choisis un message à gauche.</p>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

{#if !isDesk}
  <Sheet bind:open={sheetOpen} title="Message" wide>
    {#if sel}{@render reader(sel)}{/if}
  </Sheet>
{/if}

<style>
  .filters { display: grid; gap: 8px; }
  button.a-kpi { font: inherit; text-align: left; cursor: pointer; color: inherit; }
  button.a-kpi:hover { border-color: var(--a-dim); }
  .a-kpi.hot { border-color: rgba(251, 191, 36, 0.4); background: var(--a-warn-soft); }

  .msg-row { align-items: flex-start; }
  .msg-row.prio { border-color: rgba(248, 113, 113, 0.45); background: var(--a-bad-soft); }
  .msg-row.on { border-color: var(--a-accent); background: var(--a-accent-soft); }
  .dot { flex: 0 0 8px; height: 8px; margin-top: 7px; border-radius: 50%; background: transparent; }
  .unread .dot { background: var(--a-warn); }
  .unread .a-row-title { color: var(--a-fg); }
  .msg-row:not(.unread) .a-row-title { color: var(--a-muted); }
  .subj { color: var(--a-muted); font-weight: 600; }
  .right { flex: 0 0 auto; display: grid; justify-items: end; gap: 4px; }
  .t { font-size: 0.78rem; white-space: nowrap; }

  .pane { position: sticky; top: 80px; max-height: calc(100vh - 100px); overflow-y: auto; }


  @media (min-width: 1100px) {
    .a-cols.inbox { grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr); }
  }
</style>
