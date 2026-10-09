<script>
  import { enhance } from '$app/forms';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import Sheet from '$lib/admin/Sheet.svelte';
  import BarChart from '$lib/admin/BarChart.svelte';
  import { ago } from '$lib/admin/stats-utils.js';

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
  let confirmDelete = $state(false);
  let msg = $state(null);
  let busy = $state(false);

  function cmpDate(a, b) {
    return (b ? new Date(b).getTime() : 0) - (a ? new Date(a).getTime() : 0);
  }

  const counts = $derived(Object.fromEntries(FILTERS.map((f) => [f.key, data.rooms.filter(f.test).length])));
  const list = $derived.by(() => {
    const test = FILTERS.find((f) => f.key === filter).test;
    const needle = q.trim().toLowerCase();
    return data.rooms
      .filter((r) => test(r) && (!needle || `${r.name} ${r.code} ${r.owner ?? ''}`.toLowerCase().includes(needle)))
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
    confirmDelete = false;
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
    <div class="detail">
      <p class="a-muted">
        Code <b class="code">{room.code}</b> · créée {ago(room.created_at)}
        {#if room.owner_id}· par <a href="/admin/users/{room.owner_id}">{room.owner ?? '?'}</a>{/if}
      </p>

      <div class="a-grid2 mini">
        <div class="a-card"><span class="a-big">{room.plays7}</span><span class="a-muted">parties sur 7 jours</span></div>
        <div class="a-card">
          <span class="a-big">{room.plays7 ? Math.round((room.players7 / room.plays7) * 10) / 10 : 0}</span>
          <span class="a-muted">joueurs par partie</span>
        </div>
      </div>

      {#if msg}<p class={msg.ok ? 'a-ok' : 'a-err'}>{msg.text}</p>{/if}

      <h3 class="a-h2">Visibilité</h3>
      <div class="flags">
        {#each [['is_public', 'Publique', 'Visible dans la liste des rooms du site.'], ['is_official', 'Officielle', 'Mise en avant comme room ZIK.']] as [field, label, hint] (field)}
          <form method="POST" action="?/toggleFlag" use:enhance={submit(room[field] ? `${label} : désactivé.` : `${label} : activé.`)}>
            <input type="hidden" name="id" value={room.id} />
            <input type="hidden" name="field" value={field} />
            <input type="hidden" name="value" value={String(!room[field])} />
            <button class="flag" class:on={room[field]} type="submit" disabled={busy} aria-pressed={room[field]}>
              <span class="switch"></span>
              <span><b>{label}</b><small>{hint}</small></span>
            </button>
          </form>
        {/each}
      </div>

      <h3 class="a-h2">Modifier</h3>
      {#key room.id}
        <form class="a-form" method="POST" action="?/editRoom" use:enhance={submit('Room enregistrée.')}>
          <input type="hidden" name="id" value={room.id} />
          <div class="name-row">
            <label class="a-label emo-field">Emoji<input class="a-input" name="emoji" value={room.emoji} maxlength="4" /></label>
            <label class="a-label">Nom<input class="a-input" name="name" value={room.name} maxlength="60" required /></label>
          </div>
          <label class="a-label">Description<textarea class="a-textarea" name="description" rows="2">{room.description ?? ''}</textarea></label>
          <div class="a-form-row">
            <label class="a-label">Nombre de manches<input class="a-input" type="number" name="max_rounds" value={room.max_rounds} min="3" max="50" /></label>
            <label class="a-label">Durée d’une manche (s)<input class="a-input" type="number" name="round_duration" value={room.round_duration} min="10" max="60" /></label>
            <label class="a-label">Pause entre manches (s)<input class="a-input" type="number" name="break_duration" value={room.break_duration} min="3" max="15" /></label>
          </div>
          <label class="a-check"><input type="checkbox" name="auto_start" checked={room.auto_start} /> Lancer la partie automatiquement</label>
          <button class="a-btn primary" type="submit" disabled={busy}>Enregistrer</button>
        </form>
      {/key}

      <h3 class="a-h2">Zone dangereuse</h3>
      {#if !confirmDelete}
        <button class="a-btn danger" type="button" onclick={() => (confirmDelete = true)}>Supprimer cette room</button>
      {:else}
        <form class="a-card bad confirm" method="POST" action="?/deleteRoom" use:enhance={submit('Room supprimée.', () => (sheetOpen = false))}>
          <input type="hidden" name="id" value={room.id} />
          <p>Supprimer <b>{room.name}</b> ({room.code}) ? C’est définitif.</p>
          <div class="a-btns">
            <button class="a-btn" type="button" onclick={() => (confirmDelete = false)}>Annuler</button>
            <button class="a-btn danger" type="submit" disabled={busy}>Oui, supprimer</button>
          </div>
        </form>
      {/if}
    </div>
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

  .detail { display: grid; gap: 12px; }
  .detail a { color: var(--a-cyan); }
  .code { font-family: var(--a-display); letter-spacing: 0.06em; color: var(--a-fg); }
  .mini .a-card { display: grid; gap: 4px; }
  .flags { display: grid; gap: 8px; }
  @media (min-width: 700px) { .flags { grid-template-columns: 1fr 1fr; } }
  .flag {
    display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px;
    border: 1px solid var(--a-line); border-radius: 12px; background: var(--a-bg); color: var(--a-fg); font: inherit; text-align: left; cursor: pointer;
  }
  .flag small { display: block; font-size: 0.78rem; color: var(--a-dim); }
  .flag.on { border-color: var(--a-accent); background: var(--a-accent-soft); }
  .switch { position: relative; flex: 0 0 40px; height: 22px; border-radius: 99px; background: var(--a-surface2); transition: background 0.15s; }
  .switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: var(--a-muted); transition: transform 0.15s; }
  .flag.on .switch { background: var(--a-accent); }
  .flag.on .switch::after { transform: translateX(18px); background: #fff; }
  .name-row { display: grid; grid-template-columns: 80px 1fr; gap: 10px; }
  .confirm { display: grid; gap: 10px; }
</style>
