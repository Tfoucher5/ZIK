<script>
  import { ago } from '$lib/shared/admin/stats-utils.js';
  import { ACTION_LABELS } from '$lib/shared/admin/players.js';
  import { subjectLabel } from '$lib/shared/admin/reports.js';
  import { BANS, date } from './userAdmin.js';

  /** Messages envoyés ou reçus par le joueur et actions de l'admin sur son compte. */
  let { p, reports, audit } = $props();

  function detail(a) {
    const x = a.payload ?? {};
    if (a.action === 'ban_user') return BANS.find(([k]) => k === x.duration)?.[1];
    if (a.action === 'set_pro') return x.days ? `${x.days} jour${x.days > 1 ? 's' : ''} offert${x.days > 1 ? 's' : ''}` : 'accès retiré';
    if (a.action === 'set_role') return x.role === 'super_admin' ? 'nommé admin' : 'joueur simple';
    if (a.action === 'edit_username' || a.action === 'delete_user') return x.username;
    if (a.action === 'edit_stats') return `niveau ${x.level}, ${x.xp} XP, ELO ${x.elo}`;
    return '';
  }
</script>

<section class="a-section">
  <div class="a-section-head"><h3>Messages et signalements</h3><span class="a-muted">{reports.length}</span></div>
  {#if reports.length}
    <ul class="a-list">
      {#each reports as r (r.id)}
        <li>
          <a class="a-row" href="/admin/reports?id={r.id}">
            <span class="a-row-main">
              <span class="a-row-title">{subjectLabel(r)}</span>
              <span class="a-row-sub">{r.reporter_id === p.id ? 'Envoyé par ce joueur' : 'Vise ce joueur'} · {ago(r.created_at)}{r.message ? ` · « ${r.message} »` : ''}</span>
            </span>
            <em class="a-tag {r.status === 'pending' ? 'warn' : r.status === 'resolved' ? 'good' : ''}">{r.status === 'pending' ? 'À traiter' : r.status === 'resolved' ? 'Traité' : 'Classé'}</em>
          </a>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="a-empty">Aucun message de ce joueur.</p>
  {/if}
</section>

<section class="a-section">
  <div class="a-section-head"><h3>Actions de l'admin</h3><span class="a-muted">{audit.length}</span></div>
  {#if audit.length}
    <ol class="log">
      {#each audit as a (a.id)}
        <li>
          <b>{ACTION_LABELS[a.action] ?? a.action}</b>
          {#if detail(a)}<span>{detail(a)}</span>{/if}
          <span class="a-muted">{a.admin ? `par ${a.admin} · ` : ''}{date(a.created_at, true)}</span>
        </li>
      {/each}
    </ol>
  {:else}
    <p class="a-empty">Aucune action admin sur ce compte.</p>
  {/if}
</section>

<style>
  .log { display: grid; gap: 0; list-style: none; }
  .log li { display: flex; flex-wrap: wrap; gap: 4px 10px; padding: 10px 0; border-bottom: 1px solid var(--a-line); font-size: 0.88rem; }
  .log li:last-child { border-bottom: 0; }
  .log li > .a-muted { margin-left: auto; font-size: 0.8rem; }
</style>
