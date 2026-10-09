<script>
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import Sheet from '$lib/admin/Sheet.svelte';
  import { ago } from '$lib/admin/stats-utils.js';
  import { avatarOf } from '$lib/admin/players.js';
  import { REPORT_TYPES, TRACK_SUBJECTS, subjectLabel, contextRows } from '$lib/admin/reports.js';

  let { data, form } = $props();

  const STATES = [
    ['todo', 'À traiter'],
    ['done', 'Traités'],
    ['all', 'Tout'],
  ];
  const TYPES = [
    ['all', 'Tous'],
    ['titre', 'Titres'],
    ['bug', 'Bugs'],
    ['contact', 'Contacts'],
    ['user', 'Joueurs signalés'],
  ];
  const STATUS = {
    pending: ['À traiter', 'warn'],
    resolved: ['Traité', 'good'],
    dismissed: ['Classé sans suite', ''],
  };

  const linked = untrack(() => data.reports.find((r) => r.id === page.url.searchParams.get('id')));
  let etat = $state(linked && linked.status !== 'pending' ? 'all' : (page.url.searchParams.get('etat') ?? 'todo'));
  let type = $state(page.url.searchParams.get('type') ?? 'all');
  let selId = $state(linked?.id ?? null);
  let note = $state(linked?.admin_note ?? '');
  let reply = $state(linked?.admin_reply ?? '');
  let isDesk = $state(false);
  let sheetOpen = $state(false);
  let busy = $state(false);
  let armDel = $state(false);

  const isTrack = (r) => r.tracks.length > 0 || (r.type === 'bug' && TRACK_SUBJECTS.includes(r.subject));
  const matchType = (r, t) =>
    t === 'all' || (t === 'titre' ? isTrack(r) : t === 'bug' ? r.type === 'bug' && !isTrack(r) : r.type === t);
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
    note = r.admin_note ?? '';
    reply = r.admin_reply ?? '';
    armDel = false;
    if (openSheet && !isDesk) sheetOpen = true;
  }

  const submit = () => {
    busy = true;
    return async ({ result, update }) => {
      busy = false;
      armDel = false;
      await update({ reset: false });
      if (result.type === 'success' && !isDesk) sheetOpen = false;
    };
  };

  const who = (r) => r.reporter?.username ?? r.reporter_name ?? r.reporter_email ?? 'Anonyme';
  const full = (iso) =>
    new Date(iso).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
</script>

{#snippet reader(r)}
  <article class="reader">
    <header class="rh">
      <div class="tags">
        <em class="a-tag accent">{REPORT_TYPES[r.type] ?? r.type}</em>
        <em class="a-tag {STATUS[r.status]?.[1] ?? ''}">{STATUS[r.status]?.[0] ?? r.status}</em>
      </div>
      <h3>{subjectLabel(r)}</h3>
      <p class="a-muted when">{full(r.created_at)} · {ago(r.created_at)}</p>
    </header>

    <dl class="facts">
      <div>
        <dt>De</dt>
        <dd>
          {#if r.reporter}
            <a class="person" href="/admin/users/{r.reporter.id}"><img class="a-avatar" src={avatarOf(r.reporter)} alt="" />{r.reporter.username}</a>
          {:else}
            {r.reporter_name ?? 'Invité sans compte'}
          {/if}
          {#if r.reporter_email}<a class="mail" href="mailto:{r.reporter_email}">{r.reporter_email}</a>{/if}
        </dd>
      </div>
      {#if r.reported || r.reported_username}
        <div>
          <dt>Joueur visé</dt>
          <dd>
            {#if r.reported}
              <a class="person" href="/admin/users/{r.reported.id}"><img class="a-avatar" src={avatarOf(r.reported)} alt="" />{r.reported.username}</a>
            {:else}{r.reported_username}{/if}
          </dd>
        </div>
      {/if}
      {#if r.room_id}
        <div>
          <dt>Room</dt>
          <dd>{#if r.room}{r.room.emoji ?? ''} {r.room.name} <span class="a-muted">· {r.room_id}</span>{:else}{r.room_id}{/if}</dd>
        </div>
      {/if}
      {#each Object.entries(r.extra) as [k, v] (k)}
        <div>
          <dt>{k}</dt>
          <dd class="extra">{typeof v === 'string' ? v : JSON.stringify(v)}</dd>
        </div>
      {/each}
    </dl>

    <blockquote class="msg" class:empty={!r.message}>{r.message || 'Pas de message : le joueur a seulement désigné un titre.'}</blockquote>

    {#if r.context}
      {@const rows = contextRows(r.context)}
      <section class="ctx">
        <h4>Contexte au moment de l’envoi</h4>
        <dl class="facts">
          {#each rows as [k, v] (k + v)}
            <div><dt>{k}</dt><dd>{v}</dd></div>
          {/each}
        </dl>
        {#if r.context.errors?.length}
          <h4>Erreurs juste avant</h4>
          <ul class="errs">
            {#each r.context.errors as e, i (i)}
              <li><span class="a-muted">{new Date(e.at).toLocaleTimeString('fr-FR')}</span> {e.msg}</li>
            {/each}
          </ul>
        {/if}
        {#if r.context.userAgent}<p class="a-muted ua">{r.context.userAgent}</p>{/if}
      </section>
    {:else if r.type !== 'contact'}
      <p class="a-muted ua">Envoyé avant l’ajout du contexte automatique.</p>
    {/if}

    {#if r.tracks.length}
      <section class="tracks">
        <h4>Titres concernés</h4>
        <ul class="a-list">
          {#each r.tracks as t, i (i)}
            <li class="a-row">
              {#if t.track?.cover_url}<img class="a-cover" src={t.track.cover_url} alt="" loading="lazy" />{:else}<span class="a-cover"></span>{/if}
              <span class="a-row-main">
                <span class="a-row-title">{t.track ? `${t.track.artist} · ${t.track.title}` : (t.answer ?? 'Titre non identifié (room personnalisée)')}</span>
                <span class="a-row-sub">Manche {t.round}{t.track && !t.answer ? ' · titre caché au joueur' : ''}</span>
              </span>
              {#if t.track}<em class="a-tag {t.toFix ? 'warn' : 'good'}">{t.toFix ? 'À réparer' : 'Réglé'}</em>{/if}
            </li>
          {/each}
        </ul>
        {#if r.tracks.some((t) => t.track)}
          <a class="a-btn" href="/admin/reparer">Ouvrir dans Réparer</a>
        {/if}
      </section>
    {/if}

    <form class="a-form" method="POST" action="?/updateStatus" use:enhance={submit}>
      <input type="hidden" name="id" value={r.id} />
      <label class="a-label">
        {r.reporter_email ? `Réponse à ${r.reporter_email}` : 'Réponse (pas d’email : elle est seulement gardée ici)'}
        <textarea class="a-textarea" name="admin_reply" rows="4" bind:value={reply} placeholder="Bonjour, merci pour ton message…"></textarea>
      </label>
      {#if r.reporter_email}
        <p class="hint a-muted">Une réponse nouvelle ou modifiée part aussi par email quand tu changes l’état.</p>
      {/if}
      <label class="a-label">
        Note interne (jamais envoyée)
        <textarea class="a-textarea" name="admin_note" rows="2" bind:value={note}></textarea>
      </label>
      <div class="a-btns">
        {#if r.reporter_email}
          <button class="a-btn primary" formaction="?/sendReply" disabled={busy || !reply.trim()}>Envoyer la réponse</button>
        {/if}
        {#if r.status === 'pending'}
          <button class="a-btn good" name="status" value="resolved" disabled={busy}>Traité</button>
          <button class="a-btn" name="status" value="dismissed" disabled={busy}>Classer sans suite</button>
        {:else}
          <button class="a-btn" name="status" value="pending" disabled={busy}>Remettre à traiter</button>
        {/if}
        <button class="a-btn" name="status" value={r.status} disabled={busy}>Enregistrer</button>
      </div>
    </form>

    <form method="POST" action="?/deleteReport" use:enhance={submit} class="del">
      <input type="hidden" name="id" value={r.id} />
      {#if armDel}
        <span class="a-err">Supprimer ce message pour de bon ?</span>
        <button type="button" class="a-btn small" onclick={() => (armDel = false)}>Annuler</button>
        <button class="a-btn small danger" disabled={busy}>Confirmer</button>
      {:else}
        <button type="button" class="a-btn small danger" onclick={() => (armDel = true)}>Supprimer</button>
      {/if}
    </form>
  </article>
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
                <button class="a-row msg-row" class:on={isDesk && r.id === selId} class:unread={r.status === 'pending'} type="button" onclick={() => pick(r)} aria-current={isDesk && r.id === selId ? 'true' : undefined}>
                  <span class="dot" aria-hidden="true"></span>
                  <span class="a-row-main">
                    <span class="a-row-title">{who(r)}</span>
                    <span class="a-row-sub subj">{subjectLabel(r)}{r.room ? ` · ${r.room.name}` : ''}</span>
                    {#if r.message}<span class="a-row-sub">{r.message}</span>{/if}
                  </span>
                  <span class="right">
                    <span class="a-muted t">{ago(r.created_at)}</span>
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
  .msg-row.on { border-color: var(--a-accent); background: var(--a-accent-soft); }
  .dot { flex: 0 0 8px; height: 8px; margin-top: 7px; border-radius: 50%; background: transparent; }
  .unread .dot { background: var(--a-warn); }
  .unread .a-row-title { color: var(--a-fg); }
  .msg-row:not(.unread) .a-row-title { color: var(--a-muted); }
  .subj { color: var(--a-muted); font-weight: 600; }
  .right { flex: 0 0 auto; display: grid; justify-items: end; gap: 4px; }
  .t { font-size: 0.78rem; white-space: nowrap; }

  .pane { position: sticky; top: 80px; max-height: calc(100vh - 100px); overflow-y: auto; }

  .reader { display: grid; gap: 16px; min-width: 0; }
  .rh { display: grid; gap: 6px; }
  .rh h3 { font-family: var(--a-display); font-size: 1.6rem; font-weight: 800; line-height: 1.05; overflow-wrap: anywhere; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .when { font-size: 0.85rem; }
  .facts { display: grid; gap: 8px; padding: 12px; border-radius: 12px; background: var(--a-bg); }
  .facts > div { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 10px; align-items: center; font-size: 0.9rem; }
  dt { font-size: 0.78rem; font-weight: 700; color: var(--a-dim); text-transform: uppercase; letter-spacing: 0.04em; }
  dd { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; min-width: 0; overflow-wrap: anywhere; }
  .person { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; color: var(--a-fg); }
  .person:hover { color: var(--a-accent); }
  .person .a-avatar { width: 24px; height: 24px; }
  .mail { color: var(--a-cyan); }
  .extra { font-size: 0.8rem; color: var(--a-muted); }
  .ctx { display: grid; gap: 10px; }
  .ctx h4 { font-size: 0.8rem; font-weight: 700; color: var(--a-dim); text-transform: uppercase; letter-spacing: 0.04em; }
  .errs { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; font-family: ui-monospace, monospace; font-size: 0.78rem; color: var(--a-bad); overflow-wrap: anywhere; }
  .ua { font-size: 0.72rem; overflow-wrap: anywhere; }
  .msg { padding: 14px 16px; border-left: 3px solid var(--a-accent); border-radius: 4px 12px 12px 4px; background: var(--a-surface2); font-size: 1rem; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
  .msg.empty { color: var(--a-dim); font-style: italic; }
  .tracks { display: grid; gap: 10px; }
  .tracks h4 { font-size: 0.8rem; font-weight: 700; color: var(--a-dim); text-transform: uppercase; letter-spacing: 0.04em; }
  .tracks .a-btn { justify-self: start; }
  .hint { margin-top: -6px; font-size: 0.8rem; }
  .del { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; padding-top: 12px; border-top: 1px solid var(--a-line); }

  @media (min-width: 1100px) {
    .a-cols.inbox { grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr); }
  }
</style>
