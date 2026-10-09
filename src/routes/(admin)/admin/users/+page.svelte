<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import { avatarOf, lastSeen } from '$lib/admin/players.js';

  let { data } = $props();

  const FILTERS = [
    ['all', 'Tous', null],
    ['new', 'Nouveaux', 'new7'],
    ['pro', 'Pro', 'pro'],
    ['admin', 'Admins', null],
    ['banned', 'Bannis', 'banned'],
  ];
  const SORTS = [
    ['recent', 'Inscrits récemment'],
    ['old', 'Plus anciens'],
    ['seen', 'Dernière activité'],
    ['xp', 'Niveau'],
    ['games', 'Parties jouées'],
    ['elo', 'ELO'],
  ];

  function href(changes) {
    const p = new SvelteURLSearchParams(page.url.searchParams);
    for (const [k, v] of Object.entries(changes)) {
      if (v && !(k === 'f' && v === 'all') && !(k === 'sort' && v === 'recent') && !(k === 'page' && v === 1)) p.set(k, String(v));
      else p.delete(k);
    }
    if (!('page' in changes)) p.delete('page');
    const s = p.toString();
    return s ? `?${s}` : page.url.pathname;
  }

  let search = $state(page.url.searchParams.get('q') ?? '');
  let timer;
  function onSearch() {
    clearTimeout(timer);
    timer = setTimeout(() => goto(href({ q: search.trim() }), { keepFocus: true, noScroll: true, replaceState: true }), 300);
  }
  $effect(() => () => clearTimeout(timer));

  const pages = $derived(Math.max(1, Math.ceil(data.total / data.pageSize)));
  const day = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
</script>

<div class="adm-page">
  <PageHeader title="Joueurs" />

  <div class="a-stack">
    <div class="a-kpis">
      <a class="a-kpi" href={href({ f: 'all' })}><span class="a-kpi-label">Inscrits</span><span class="a-kpi-value">{data.kpis.total}</span><span class="a-kpi-sub">au total</span></a>
      <a class="a-kpi" href={href({ f: 'new' })}><span class="a-kpi-label">Nouveaux</span><span class="a-kpi-value">{data.kpis.new7}</span><span class="a-kpi-sub">sur 7 jours</span></a>
      <div class="a-kpi"><span class="a-kpi-label">Actifs</span><span class="a-kpi-value">{data.kpis.active7}</span><span class="a-kpi-sub">ont joué sur 7 jours</span></div>
      <a class="a-kpi" href={href({ f: 'pro' })}><span class="a-kpi-label">Pro actifs</span><span class="a-kpi-value accent">{data.kpis.pro}</span><span class="a-kpi-sub">payés ou offerts</span></a>
      <a class="a-kpi" href={href({ f: 'banned' })}><span class="a-kpi-label">Bannis</span><span class="a-kpi-value" class:bad={data.kpis.banned}>{data.kpis.banned}</span><span class="a-kpi-sub">en ce moment</span></a>
    </div>

    <div class="a-toolbar">
      <label class="a-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span class="a-sr">Rechercher un pseudo</span>
        <input type="search" placeholder="Rechercher un pseudo…" bind:value={search} oninput={onSearch} autocomplete="off" />
      </label>
      <label class="sort">
        <span class="a-sr">Trier par</span>
        <select class="a-select" value={data.sort} onchange={(e) => goto(href({ sort: e.currentTarget.value }), { noScroll: true })}>
          {#each SORTS as [k, label] (k)}<option value={k}>{label}</option>{/each}
        </select>
      </label>
    </div>

    <nav class="a-chips" aria-label="Filtrer les joueurs">
      {#each FILTERS as [k, label, kpi] (k)}
        <a class="a-chip" href={href({ f: k })} aria-current={data.f === k ? 'page' : undefined}>{label}{#if kpi && data.kpis[kpi]}<b>{data.kpis[kpi]}</b>{/if}</a>
      {/each}
    </nav>

    {#if data.error}
      <p class="a-card bad a-err">{data.error}</p>
    {:else if !data.users.length}
      <p class="a-card a-empty">Aucun joueur ne correspond{data.q ? ` à « ${data.q} »` : ''}.</p>
    {:else}
      <p class="count a-muted">{data.total} joueur{data.total > 1 ? 's' : ''}{data.q ? ` pour « ${data.q} »` : ''}</p>

      <ul class="a-list mob">
        {#each data.users as u (u.id)}
          <li>
            <a class="a-row" href="/admin/users/{u.id}">
              <img class="a-avatar" src={avatarOf(u)} alt="" loading="lazy" />
              <span class="a-row-main">
                <span class="a-row-title">{u.username}</span>
                <span class="a-row-sub">Niv. {u.level} · {u.games_played} partie{u.games_played > 1 ? 's' : ''} · {lastSeen(u.last_played_date) ?? `inscrit ${day(u.created_at)}`}</span>
              </span>
              <span class="tags">
                {#if u.banned}<em class="a-tag bad">Banni</em>{/if}
                {#if u.pro}<em class="a-tag accent">Pro</em>{/if}
                {#if u.role === 'super_admin'}<em class="a-tag warn">Admin</em>{/if}
              </span>
            </a>
          </li>
        {/each}
      </ul>

      <div class="a-table-wrap desk">
        <table class="a-table">
          <thead>
            <tr>
              <th>Joueur</th>
              <th>Inscription</th>
              <th class="num">Niveau</th>
              <th class="num">XP</th>
              <th class="num">ELO</th>
              <th class="num">Parties</th>
              <th>Dernière partie</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each data.users as u (u.id)}
              <tr>
                <td>
                  <a class="who" href="/admin/users/{u.id}">
                    <img class="a-avatar" src={avatarOf(u)} alt="" loading="lazy" />
                    <b>{u.username}</b>
                  </a>
                </td>
                <td class="a-muted">{day(u.created_at)}</td>
                <td class="num">{u.level}</td>
                <td class="num a-muted">{u.xp.toLocaleString('fr-FR')}</td>
                <td class="num a-muted">{u.elo}</td>
                <td class="num">{u.games_played}</td>
                <td class="a-muted">{lastSeen(u.last_played_date) ?? '—'}</td>
                <td><span class="tags">
                  {#if u.banned}<em class="a-tag bad">Banni</em>{/if}
                  {#if u.pro}<em class="a-tag accent">Pro</em>{/if}
                  {#if u.role === 'super_admin'}<em class="a-tag warn">Admin</em>{/if}
                </span></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      {#if pages > 1}
        <nav class="a-pager" aria-label="Pages">
          {#if data.page > 1}<a class="a-btn small" href={href({ page: data.page - 1 })}>Précédent</a>{/if}
          <span>Page {data.page} sur {pages}</span>
          {#if data.page < pages}<a class="a-btn small" href={href({ page: data.page + 1 })}>Suivant</a>{/if}
        </nav>
      {/if}
    {/if}
  </div>
</div>

<style>
  .sort { flex: 0 1 220px; }
  .accent { color: var(--a-accent); }
  .bad { color: var(--a-bad); }
  .count { font-size: 0.82rem; margin-bottom: -6px; }
  .tags { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px; }
  .a-row .tags { flex: 0 0 auto; max-width: 40%; }
  .who { display: flex; align-items: center; gap: 10px; }
  .who .a-avatar { width: 32px; height: 32px; }
  .desk { display: none; }
  @media (min-width: 900px) {
    .mob { display: none; }
    .desk { display: block; }
  }
</style>
