<script>
  import { enhance } from '$app/forms';
  import { ago } from '$lib/shared/admin/stats-utils.js';
  import { avatarOf } from '$lib/shared/admin/players.js';
  import { REPORT_TYPES, subjectLabel, contextRows, isSalon } from '$lib/shared/admin/reports.js';

  /** Un message reçu : qui, quoi, contexte, titres concernés, réponse et traitement. */
  let { r, busy, submit } = $props();

  const STATUS = {
    pending: ['À traiter', 'warn'],
    resolved: ['Traité', 'good'],
    dismissed: ['Classé sans suite', ''],
  };

  // svelte-ignore state_referenced_locally
  let note = $state(r.admin_note ?? '');
  // svelte-ignore state_referenced_locally
  let reply = $state(r.admin_reply ?? '');
  let armDel = $state(false);

  // Après l'envoi, la suppression n'attend plus de confirmation
  const send = () => {
    const after = submit();
    return async (args) => {
      armDel = false;
      await after(args);
    };
  };

  const full = (iso) =>
    new Date(iso).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
</script>

<article class="reader">
  <header class="rh">
    <div class="tags">
      <em class="a-tag accent">{REPORT_TYPES[r.type] ?? r.type}</em>
      <em class="a-tag {STATUS[r.status]?.[1] ?? ''}">{STATUS[r.status]?.[0] ?? r.status}</em>
      {#if r.priority}<em class="a-tag bad">Pro · prioritaire</em>{/if}
    </div>
    <h3>{subjectLabel(r)}</h3>
    <p class="a-muted when">{full(r.created_at)} · {ago(r.created_at)}</p>
    {#if isSalon(r)}
      {#if r.salonLive}
        <a class="a-btn primary live-btn" href="/admin/salons?code={r.room_id}"><span class="live-dot"></span>Ouvrir le salon en direct</a>
      {:else}
        <p class="a-muted when">Le salon {r.room_id} est terminé.</p>
      {/if}
    {/if}
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
        <dt>{isSalon(r) ? 'Salon' : 'Room'}</dt>
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

  <form class="a-form" method="POST" action="?/updateStatus" use:enhance={send}>
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

  <form method="POST" action="?/deleteReport" use:enhance={send} class="del">
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

<style>
  .live-btn { justify-self: start; gap: 8px; }
  .live-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; animation: live 1.4s ease-in-out infinite; }
  @keyframes live { 50% { opacity: 0.3; } }

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
</style>
