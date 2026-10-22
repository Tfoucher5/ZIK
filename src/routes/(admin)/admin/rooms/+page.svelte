<script>
  import PageHeader from '$lib/components/admin/PageHeader.svelte';
  import Sheet from '$lib/components/admin/Sheet.svelte';
  import BarChart from '$lib/components/admin/BarChart.svelte';
  import RoomAdminDetail from '$lib/components/admin/rooms/RoomAdminDetail.svelte';
  import { ago } from '$lib/shared/admin/stats-utils.js';
  import { fuzzyFilter } from '$lib/shared/fuzzy.js';

  let { data } = $props();

  const FILTERS = [
    { key: 'all', label: 'Toutes', test: () => true },
    { key: 'public', label: 'Publiques', test: (r) => r.is_public },
    { key: 'official', label: 'Officielles', test: (r) => r.is_official },
    { key: 'private', label: 'Privées', test: (r) => !r.is_public },
    { key: 'live', label: 'En cours', test: (r) => r.liveNow > 0 },
  ];
  const SORTS = {
    plays: { label: 'Les plus jouées (7 j)', fn: (a, b) => b.plays7 - a.plays7 || cmpDate(a.last_active_at, b.last_active_at) },
    active: { label: 'Dernière activité', fn: (a, b) => cmpDate(a.last_active_at, b.last_active_at) },
    created: { label: 'Plus récentes', fn: (a, b) => cmpDate(a.created_at, b.created_at) },
    name: { label: 'Nom', fn: (a, b) => a.name.localeCompare(b.name, 'fr') },
  };
  const STEP = 50;

  let q = $state('');
  let filter = $state('all');
  let sort = $state('plays');
  let shown = $state(STEP);
  let selectedId = $state(null);
  let sheetOpen = $state(false);
  let msg = $state(null);
  let busy = $state(false);

  function cmpDate(a, b) {
    return (b ? new Date(b).getTime() : 0) - (a ? new Date(a).getTime() : 0);
  }

  const counts = $derived(Object.fromEntries(FILTERS.map((f) => [f.key, data.rooms.filter(f.test).length])));
  const list = $derived.by(() => {
    const test = FILTERS.find((f) => f.key === filter).test;
    return fuzzyFilter(data.rooms, q, ['name', 'code', 'owner'])
      .filter(test)
      .sort(SORTS[sort].fn);
  });
  const top = $derived([...data.rooms].filter((r) => r.plays7).sort((a, b) => b.plays7 - a.plays7).slice(0, 6));
  const topMax = $derived(top[0]?.plays7 ?? 1);
  const playedRooms = $derived(data.rooms.filter((r) => r.plays7).length);
  const liveRooms = $derived(data.rooms.filter((r) => r.liveNow));
  const room = $derived(data.rooms.find((r) => r.id === selectedId) ?? null);

  $effect(() => {
    void q;
    void filter;
    void sort;
    shown = STEP;
  });

  function open(r) {
    selectedId = r.id;
    msg = null;
    sheetOpen = true;
  }

  function submit(okText, after) {
    return () => {
      busy = true;
      return async ({ result, update }) => {
        busy = false;
        if (result.type === 'success' && result.data?.success) {
          msg = { ok: true, text: okText };
          after?.();
        } else {
          msg = { ok: false, text: result.data?.error ?? 'L’action a échoué.' };
        }
        await update({ reset: false });
      };
    };
  }

  const settings = (r) => `${r.max_rounds} manches · ${r.round_duration} s`;
</script>

<div class="adm-page">
  <PageHeader title="Rooms" />

  <div class="a-stack">
    {#if data.error}<p class="a-card bad">{data.error}</p>{/if}

    <div class="a-kpis">
      <div class="a-kpi">
        <span class="a-kpi-label">Rooms</span>
        <span class="a-kpi-value">{data.rooms.length}</span>
        <span class="a-kpi-sub">{counts.public} publiques · {counts.private} privées</span>
      </div>
      <div class="a-kpi">
        <span class="a-kpi-label">Officielles</span>
        <span class="a-kpi-value">{counts.official}</span>
        <span class="a-kpi-sub">mises en avant sur le site</span>
      </div>
      <div class="a-kpi">
        <span class="a-kpi-label">Parties sur 7 jours</span>
        <span class="a-kpi-value">{data.games7}</span>
        <span class="a-kpi-sub">dans {playedRooms} room{playedRooms > 1 ? 's' : ''}</span>
      </div>
      <a class="a-kpi" href="/admin/live">
        <span class="a-kpi-label">En cours maintenant</span>
        <span class="a-kpi-value">{liveRooms.length}</span>
        <span class="a-kpi-sub">{liveRooms.reduce((n, r) => n + r.liveNow, 0)} joueurs connectés →</span>
      </a>
    </div>

    <div class="a-cols">
      <section class="a-section">
        <div class="a-section-head"><h2>Parties par jour</h2><span class="a-muted small">7 derniers jours</span></div>
        <BarChart bars={data.days} partialLast />
      </section>
      <section class="a-section">
        <div class="a-section-head"><h2>Les plus jouées</h2><span class="a-muted small">7 j</span></div>
        {#if top.length}
          <ol class="top">
            {#each top as r, i (r.id)}
              <li>
                <button type="button" onclick={() => open(r)}>
                  <span class="rank">{i + 1}</span>
                  <span class="top-main">
                    <span class="top-name">{r.emoji} {r.name}</span>
                    <span class="a-meter"><i style="width:{(r.plays7 / topMax) * 100}%"></i></span>
                  </span>
                  <b>{r.plays7}</b>
                </button>
              </li>
            {/each}
          </ol>
        {:else}
          <p class="a-empty">Aucune partie cette semaine.</p>
        {/if}
      </section>
    </div>

    <div class="a-toolbar">
      <label class="a-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span class="a-sr">Rechercher</span>
        <input type="search" placeholder="Nom, code ou créateur…" bind:value={q} />
      </label>
      <select class="a-select sort" bind:value={sort} aria-label="Trier">
        {#each Object.entries(SORTS) as [key, s] (key)}<option value={key}>{s.label}</option>{/each}
      </select>
    </div>
    <div class="a-chips" role="group" aria-label="Filtrer">
      {#each FILTERS as f (f.key)}
        <button class="a-chip" type="button" aria-pressed={filter === f.key} onclick={() => (filter = f.key)}>{f.label}<b>{counts[f.key]}</b></button>
      {/each}
    </div>

    {#if list.length === 0}
      <p class="a-card a-empty">Aucune room ne correspond.</p>
    {:else}
      <div class="a-table-wrap desk">
        <table class="a-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Créateur</th>
              <th>Visibilité</th>
              <th class="num">Parties 7 j</th>
              <th>Réglages</th>
              <th>Dernière activité</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each list.slice(0, shown) as r (r.id)}
              <tr>
                <td>
                  <button class="name-btn" type="button" onclick={() => open(r)}>
                    <span class="emo">{r.emoji}</span>
                    <span><b>{r.name}</b><small>{r.code}</small></span>
                  </button>
                </td>
                <td>{#if r.owner_id}<a href="/admin/users/{r.owner_id}">{r.owner ?? '?'}</a>{:else}<span class="a-muted">—</span>{/if}</td>
                <td class="tags">
                  {#if r.is_official}<em class="a-tag accent">Officielle</em>{/if}
                  <em class="a-tag" class:good={r.is_public}>{r.is_public ? 'Publique' : 'Privée'}</em>
                  {#if r.liveNow}<em class="a-tag good">● {r.liveNow} en jeu</em>{/if}
                </td>
                <td class="num">{r.plays7 || '—'}</td>
                <td class="a-muted">{settings(r)}</td>
                <td class="a-muted">{r.last_active_at ? ago(r.last_active_at) : 'jamais'}</td>
                <td class="num"><button class="a-btn small" type="button" onclick={() => open(r)}>Gérer</button></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <ul class="a-list mob">
        {#each list.slice(0, shown) as r (r.id)}
          <li>
            <button class="a-row" type="button" onclick={() => open(r)}>
              <span class="emo">{r.emoji}</span>
              <span class="a-row-main">
                <span class="a-row-title">{r.name}</span>
                <span class="a-row-sub">{r.code} · {r.owner ?? 'sans créateur'} · {r.last_active_at ? ago(r.last_active_at) : 'jamais jouée'}</span>
                <span class="tags">
                  {#if r.is_official}<em class="a-tag accent">Officielle</em>{/if}
                  <em class="a-tag" class:good={r.is_public}>{r.is_public ? 'Publique' : 'Privée'}</em>
                  {#if r.liveNow}<em class="a-tag good">● {r.liveNow} en jeu</em>{/if}
                </span>
              </span>
              <span class="plays"><b>{r.plays7}</b><small>parties<br />7 j</small></span>
            </button>
          </li>
        {/each}
      </ul>

      {#if list.length > shown}
        <div class="a-pager">
          <span>{shown} sur {list.length}</span>
          <button class="a-btn small" type="button" onclick={() => (shown += STEP)}>Afficher plus</button>
        </div>
      {/if}
    {/if}
  </div>
</div>

<Sheet bind:open={sheetOpen} title={room ? `${room.emoji} ${room.name}` : 'Room'} wide>
  {#if room}
    {#key room.id}<RoomAdminDetail {room} {msg} {busy} {submit} onDeleted={() => (sheetOpen = false)} />{/key}
  {/if}
</Sheet>

<style>
  .small { font-size: 0.8rem; }
  .top { display: grid; gap: 4px; list-style: none; }
  .top button {
    display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 6px;
    border: 0; border-radius: 10px; background: none; color: var(--a-fg); font: inherit; text-align: left; cursor: pointer;
  }
  .top button:hover { background: var(--a-surface2); }
  .rank { width: 20px; font-family: var(--a-display); font-weight: 800; color: var(--a-dim); text-align: center; }
  .top-main { flex: 1; min-width: 0; display: grid; gap: 5px; }
  .top-name { overflow: hidden; font-size: 0.9rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .top b { font-family: var(--a-display); font-size: 1.2rem; }

  .sort { flex: 0 1 220px; width: auto; }

  .name-btn { display: flex; align-items: center; gap: 10px; border: 0; background: none; color: var(--a-fg); font: inherit; text-align: left; cursor: pointer; }
  .name-btn b { display: block; }
  .name-btn:hover b { color: var(--a-accent); }
  .name-btn small, .plays small { font-size: 0.75rem; color: var(--a-dim); }
  .emo { flex: 0 0 auto; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 10px; background: var(--a-surface2); font-size: 1.2rem; }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .plays { display: grid; justify-items: center; text-align: center; line-height: 1.1; }
  .plays b { font-family: var(--a-display); font-size: 1.4rem; }

  .mob { display: grid; }
  .desk { display: none; }
  @media (min-width: 900px) {
    .mob { display: none; }
    .desk { display: block; }
  }
</style>
