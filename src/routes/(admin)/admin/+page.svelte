<script>
  import { getContext, onMount } from 'svelte';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import { ago } from '$lib/admin/stats-utils.js';

  let { data } = $props();

  const adminCtx = getContext('adminToken');
  const alertsCtx = getContext('adminAlerts');
  const token = $derived(adminCtx?.token ?? '');
  const live = $derived(alertsCtx?.value?.live ?? data.live);

  let pulse = $state(null);
  let seen = $state(null);

  const urgent = $derived(data.todo.filter((t) => t.tone === 'bad'));
  const toCheck = $derived(data.todo.filter((t) => t.tone !== 'info'));
  const verdict = $derived(
    urgent.length
      ? { tone: 'bad', title: 'À traiter en priorité', text: urgent[0].label }
      : toCheck.length
        ? { tone: 'warn', title: `${toCheck.length} chose${toCheck.length > 1 ? 's' : ''} à regarder`, text: 'Rien de cassé, mais ça attend ta main.' }
        : { tone: 'good', title: 'Tout roule', text: 'Rien à traiter pour le moment.' },
  );
  const fresh = $derived(seen ? data.journal.filter((e) => e.ts > seen).length : 0);

  onMount(() => {
    try {
      seen = localStorage.getItem('zik_admin_seen');
      localStorage.setItem('zik_admin_seen', new Date().toISOString());
    } catch { /* stockage indisponible */ }
  });

  $effect(() => {
    if (!token) return;
    fetch(`/api/admin/pulse?days=7&token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (pulse = d));
  });

  const ICON = { signup: '👋', pro: '⭐', pro_bad: '⚠️', salon: '📺', report: '✉️', issue: '🔧', prospect: '📨' };
  const trend = (d) => (d.pct === null ? 'nouveau' : `${d.dir === 'up' ? '▲' : d.dir === 'down' ? '▼' : '='} ${Math.abs(d.pct)} %`);
</script>

<div class="adm-page">
  <PageHeader title="Accueil" />

  <div class="a-stack">
    <section class="a-card verdict {verdict.tone}">
      <span class="v-dot"></span>
      <div>
        <p class="v-title">{verdict.title}</p>
        <p class="v-text">{verdict.text}</p>
      </div>
    </section>

    {#if data.todo.length}
      <h2 class="a-h2">À faire</h2>
      <ul class="a-list">
        {#each data.todo as t (t.key)}
          <li>
            <a class="a-row todo {t.tone}" href={t.href}>
              <span class="t-mark"></span>
              <span class="a-row-main"><span class="t-label">{t.label}</span></span>
              <span class="a-btn small">{t.action}</span>
            </a>
          </li>
        {/each}
      </ul>
    {/if}

    <h2 class="a-h2">En ce moment</h2>
    <a class="a-card live" href="/admin/salons">
      <span class="l-dot" class:on={live.players > 0}></span>
      <span class="l-main">
        {#if live.players > 0}
          <b>{live.players} joueur{live.players > 1 ? 's' : ''} en ligne</b>
          <span class="a-muted">{live.salons} salon{live.salons > 1 ? 's' : ''} · {live.rooms} room{live.rooms > 1 ? 's' : ''} active{live.rooms > 1 ? 's' : ''}</span>
        {:else}
          <b>Personne ne joue</b>
          <span class="a-muted">Aucun salon ni room active</span>
        {/if}
      </span>
      <span class="a-muted">›</span>
    </a>

    <h2 class="a-h2">Cette semaine</h2>
    <div class="a-grid2 a-grid4">
      <a class="a-card vital" href="/admin/chiffres">
        <span class="vl">Parties à plusieurs</span>
        <span class="a-big">{pulse?.north.value ?? '…'}</span>
        <span class="vs">objectif {pulse?.north.target ?? 60}</span>
      </a>
      <a class="a-card vital" href="/admin/chiffres">
        <span class="vl">Joueurs actifs</span>
        <span class="a-big">{pulse?.week.players.value ?? '…'}</span>
        <span class="vs {pulse?.week.players.delta.dir}">{pulse ? trend(pulse.week.players.delta) : ''}</span>
      </a>
      <a class="a-card vital" href="/admin/chiffres">
        <span class="vl">Inscriptions</span>
        <span class="a-big">{pulse?.week.signups.value ?? '…'}</span>
        <span class="vs {pulse?.week.signups.delta.dir}">{pulse ? trend(pulse.week.signups.delta) : ''}</span>
      </a>
      <a class="a-card vital" href="/admin/argent">
        <span class="vl">Abonnés Pro</span>
        <span class="a-big">{data.pro}</span>
        <span class="vs">actifs aujourd'hui</span>
      </a>
    </div>

    <h2 class="a-h2">
      Dernières 48 h
      {#if fresh}<em class="a-tag accent">{fresh} nouveau{fresh > 1 ? 'x' : ''} depuis ta visite</em>{/if}
    </h2>
    {#if data.journal.length}
      <ol class="journal">
        {#each data.journal as e, i (i)}
          <li class:new={seen && e.ts > seen}>
            <a href={e.href}>
              <span class="j-ico" aria-hidden="true">{ICON[e.kind]}</span>
              <span class="j-text">{e.text}</span>
              <span class="j-ts">{ago(e.ts)}</span>
            </a>
          </li>
        {/each}
      </ol>
      <a class="a-btn" href="/admin/journal">Tout le journal</a>
    {:else}
      <p class="a-empty">Rien de neuf depuis 48 h.</p>
    {/if}
  </div>
</div>

<style>
  .verdict { display: flex; align-items: center; gap: 14px; padding: 18px; }
  .v-dot { flex: 0 0 14px; height: 14px; border-radius: 50%; background: var(--a-good); box-shadow: 0 0 0 5px var(--a-good-soft); }
  .verdict.warn .v-dot { background: var(--a-warn); box-shadow: 0 0 0 5px var(--a-warn-soft); }
  .verdict.bad .v-dot { background: var(--a-bad); box-shadow: 0 0 0 5px var(--a-bad-soft); }
  .v-title { font-family: var(--a-display); font-size: 1.5rem; font-weight: 800; text-transform: uppercase; }
  .v-text { font-size: 0.9rem; color: var(--a-muted); }

  .todo .t-mark { flex: 0 0 4px; align-self: stretch; border-radius: 4px; background: var(--a-dim); }
  .todo.bad .t-mark { background: var(--a-bad); }
  .todo.warn .t-mark { background: var(--a-warn); }
  .todo.info .t-mark { background: var(--a-cyan); }
  .t-label { font-size: 0.92rem; font-weight: 600; line-height: 1.3; }

  .live { display: flex; align-items: center; gap: 14px; }
  .l-dot { flex: 0 0 10px; height: 10px; border-radius: 50%; background: var(--a-dim); }
  .l-dot.on { background: var(--a-good); animation: pulse 1.8s infinite; }
  @keyframes pulse {
    from { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.6); }
    to { box-shadow: 0 0 0 9px rgba(74, 222, 128, 0); }
  }
  @media (prefers-reduced-motion: reduce) { .l-dot.on { animation: none; } }
  .l-main { flex: 1; display: grid; gap: 2px; font-size: 0.85rem; }
  .l-main b { font-size: 1rem; }

  .vital { display: grid; gap: 6px; }
  .vl { font-size: 0.8rem; font-weight: 600; color: var(--a-muted); }
  .vs { font-size: 0.78rem; color: var(--a-dim); }
  .vs.up { color: var(--a-good); }
  .vs.down { color: var(--a-bad); }

  .a-h2 { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .a-h2 .a-tag { font-family: inherit; letter-spacing: 0; text-transform: none; }

  .journal { display: grid; list-style: none; border: 1px solid var(--a-line); border-radius: 14px; background: var(--a-surface); overflow: hidden; }
  .journal li + li { border-top: 1px solid var(--a-line); }
  .journal a { display: flex; align-items: center; gap: 10px; padding: 11px 14px; font-size: 0.88rem; }
  .journal li.new { background: var(--a-accent-soft); }
  .j-ico { flex: 0 0 22px; text-align: center; }
  .j-text { flex: 1; min-width: 0; }
  .j-ts { flex: 0 0 auto; font-size: 0.75rem; color: var(--a-dim); }
</style>
