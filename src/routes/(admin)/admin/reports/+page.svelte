<script>
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import { getContext } from 'svelte';
  import TrackAudioDebugger from '$lib/components/admin/TrackAudioDebugger.svelte';

  let { data } = $props();
  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  let expandedId = $state(null);
  let noteValues = $state({});
  let replyValues = $state({});
  let sentIds = $state({});
  let deleteModal = $state(null);

  const TYPE_LABELS = { bug: 'Bug', user: 'Utilisateur', contact: 'Contact' };

  function fmt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function setFilter(key, value) {
    const p = new SvelteURLSearchParams(page.url.searchParams);
    if (value) p.set(key, value); else p.delete(key);
    goto(`?${p.toString()}`);
  }
</script>

<div class="zk">
  <div class="zk-head">
    <h1>Signalements</h1>
    <span class="zk-date">{data.reports.length} résultats</span>
    <div class="toolbar">
      <select onchange={e => setFilter('status', e.target.value)} value={data.filters.status} class="field-input">
        <option value="pending">En attente</option>
        <option value="resolved">Résolus</option>
        <option value="dismissed">Rejetés</option>
        <option value="">Tous</option>
      </select>
      <select onchange={e => setFilter('type', e.target.value)} value={data.filters.type} class="field-input">
        <option value="">Tous types</option>
        <option value="bug">Bug</option>
        <option value="user">Utilisateur</option>
        <option value="contact">Contact</option>
      </select>
    </div>
  </div>

  {#if data.error}
    <div class="alert alert-err">{data.error}</div>
  {:else if data.reports.length === 0}
    <p class="hint">Aucun signalement.</p>
  {:else}
    <div class="list">
      {#each data.reports as r (r.id)}
        <div class="panel card" data-status={r.status}>
          <button type="button" class="card-head" onclick={() => expandedId = expandedId === r.id ? null : r.id}>
            <span class="tag" class:tag-amber={r.status === 'pending'} class:tag-green={r.status === 'resolved'}>{TYPE_LABELS[r.type] || r.type}</span>
            <span class="card-from">{r.resolved_username || r.reporter_email || 'Anonyme'}</span>
            {#if r.reported_username}
              <span class="td-dim">→ {r.reported_username}</span>
            {/if}
            {#if r.resolved_room}
              <span class="td-dim">{r.resolved_room.emoji} {r.resolved_room.name}</span>
            {:else if r.room_id}
              <span class="td-dim">#{r.room_id}</span>
            {/if}
            <span class="td-dim card-date">{fmt(r.created_at)}</span>
            <span class="chevron">{expandedId === r.id ? '▲' : '▼'}</span>
          </button>

          {#if expandedId === r.id}
            <div class="card-body">
              {#if r.subject}
                <div class="field-label">Sujet : <span class="td-strong">{r.subject}</span></div>
              {/if}
              <div class="message">{r.message}</div>

              {#if r.metadata?.tracks?.length}
                {#each r.metadata.tracks as t (t.trackId ?? t.round)}
                  {#if t.trackId}
                    <div class="field-label">
                      Manche {t.round}{t.answer ? ` · ${t.answer}` : ' · titre masqué en jeu'}
                    </div>
                    <TrackAudioDebugger trackId={t.trackId} {token} />
                  {:else}
                    <div class="field-label">
                      Manche {t.round} — titre non identifiable (room personnalisée)
                    </div>
                  {/if}
                {/each}
              {/if}

              {#if r.metadata && Object.keys(r.metadata).length}
                <pre class="meta">{JSON.stringify(r.metadata, null, 2)}</pre>
              {/if}

              <form method="POST" action="?/updateStatus" use:enhance={({ formElement }) => {
                const isReply = formElement.getAttribute('data-reply') === 'true';
                return async ({ result, update }) => {
                  if (isReply && result.type === 'success') sentIds = { ...sentIds, [r.id]: true };
                  setTimeout(() => { sentIds = { ...sentIds, [r.id]: false }; }, 3000);
                  await update({ reset: false });
                };
              }} class="form-col">
                <input type="hidden" name="_token" value={token}>
                <input type="hidden" name="id" value={r.id}>

                <label class="field">
                  <span class="field-label">Note interne</span>
                  <textarea
                    name="admin_note"
                    class="field-input"
                    placeholder="Note interne…"
                    rows="2"
                    bind:value={noteValues[r.id]}
                  >{r.admin_note || ''}</textarea>
                </label>

                {#if r.reporter_email || r.resolved_username}
                  <label class="field">
                    <span class="field-label">
                      Réponse{r.reporter_email ? ` → ${r.reporter_email}` : ' (pas d\'email — stockée seulement)'}
                    </span>
                    <textarea
                      name="admin_reply"
                      class="field-input"
                      placeholder="Réponse…"
                      rows="3"
                      bind:value={replyValues[r.id]}
                    >{r.admin_reply || ''}</textarea>
                    {#if r.reporter_email}
                      <button
                        type="submit"
                        formaction="?/sendReply"
                        data-reply="true"
                        class="btn btn-primary"
                        disabled={!replyValues[r.id]?.trim()}
                      >{sentIds[r.id] ? 'Envoyé ✓' : 'Envoyer la réponse'}</button>
                    {/if}
                  </label>
                {/if}

                {#if r.admin_reply}
                  <div class="saved-reply">Réponse enregistrée : {r.admin_reply}</div>
                {/if}

                <div class="actions">
                  <button name="status" value="resolved" class="btn btn-ok">Résoudre</button>
                  <button name="status" value="dismissed" class="btn">Rejeter</button>
                  {#if r.status !== 'pending'}
                    <button name="status" value="pending" class="btn">Rouvrir</button>
                  {/if}
                  <button type="button" class="btn btn-danger" onclick={() => deleteModal = r}>Supprimer</button>
                </div>
              </form>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if deleteModal}
  <div class="modal-overlay" onclick={() => deleteModal = null} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
      <div class="modal-title">Supprimer le signalement</div>
      <p class="modal-warn">Supprimer définitivement ce signalement ({TYPE_LABELS[deleteModal.type] || deleteModal.type}) ?</p>
      <form method="POST" action="?/deleteReport" use:enhance={() => async ({ update }) => { await update({ reset: false }); deleteModal = null; }}>
        <input type="hidden" name="_token" value={token}>
        <input type="hidden" name="id" value={deleteModal.id}>
        <div class="modal-btns">
          <button type="button" class="btn" onclick={() => deleteModal = null}>Annuler</button>
          <button type="submit" class="btn btn-danger">Supprimer</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .zk {
    --c-panel: #13161e;
    --c-border: rgba(255, 255, 255, 0.07);
    --c-text: #e2e8f0;
    --c-muted: #6b7280;
    --c-green: #22c55e;
    --c-red: #ef4444;
    --c-amber: #f59e0b;
    --c-indigo: #6366f1;
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-family: 'Inter', system-ui, sans-serif;
    color: var(--c-text);
  }

  .zk-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .zk-head h1 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; }
  .zk-date { font-size: 0.78rem; color: var(--c-muted); }
  .toolbar { display: flex; gap: 8px; margin-left: auto; }

  .field-input {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--c-border);
    border-radius: 6px;
    color: var(--c-text);
    font-family: inherit;
    font-size: 0.82rem;
    padding: 7px 10px;
    outline: none;
  }
  .field-input:focus { border-color: rgba(255, 255, 255, 0.2); }

  .hint { font-size: 0.82rem; color: var(--c-muted); }

  .list { display: flex; flex-direction: column; gap: 8px; }

  .panel {
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
  }
  .card[data-status="pending"] { border-left: 3px solid var(--c-amber); }
  .card[data-status="resolved"] { border-left: 3px solid var(--c-green); }

  .card-head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    cursor: pointer;
    background: none;
    border: none;
    text-align: left;
    font-family: inherit;
    color: var(--c-text);
    font-size: 0.84rem;
    flex-wrap: wrap;
    width: 100%;
  }
  .card-head:hover { background: rgba(255, 255, 255, 0.02); }

  .card-from { font-weight: 500; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .card-date { margin-left: auto; }
  .chevron { font-size: 0.68rem; color: var(--c-muted); }

  .card-body {
    padding: 0 16px 18px;
    border-top: 1px solid var(--c-border);
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 4px;
    padding-top: 14px;
  }

  .message {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--c-border);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 0.84rem;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--c-text);
  }

  .meta {
    background: rgba(0, 0, 0, 0.25);
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 0.72rem;
    color: var(--c-muted);
    overflow-x: auto;
  }

  .form-col { display: flex; flex-direction: column; gap: 10px; }
  .field { display: flex; flex-direction: column; gap: 5px; }
  .field-label { font-size: 0.75rem; color: var(--c-muted); }
  .td-strong { color: var(--c-text); font-weight: 500; }
  .td-dim { color: var(--c-muted); font-size: 0.78rem; white-space: nowrap; }

  .saved-reply { font-size: 0.75rem; color: var(--c-muted); border-left: 2px solid var(--c-border); padding-left: 8px; }

  .actions { display: flex; gap: 8px; flex-wrap: wrap; }

  .btn {
    background: transparent;
    border: 1px solid var(--c-border);
    color: var(--c-text);
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 500;
    padding: 7px 14px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.15); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-primary { border-color: rgba(99, 102, 241, 0.4); color: var(--c-indigo); }
  .btn-primary:hover:not(:disabled) { background: rgba(99, 102, 241, 0.08); border-color: rgba(99, 102, 241, 0.6); }
  .btn-ok { border-color: rgba(34, 197, 94, 0.4); color: var(--c-green); }
  .btn-ok:hover:not(:disabled) { background: rgba(34, 197, 94, 0.08); border-color: rgba(34, 197, 94, 0.6); }
  .btn-danger { border-color: rgba(239, 68, 68, 0.3); color: var(--c-red); }
  .btn-danger:hover:not(:disabled) { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.5); }

  .tag { font-size: 0.72rem; font-weight: 500; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--c-border); color: var(--c-muted); white-space: nowrap; }
  .tag-amber { color: var(--c-amber); border-color: rgba(245, 158, 11, 0.3); }
  .tag-green { color: var(--c-green); border-color: rgba(34, 197, 94, 0.3); }

  .alert { font-size: 0.84rem; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--c-border); }
  .alert-err { color: var(--c-red); border-color: rgba(239, 68, 68, 0.3); }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
  }
  .modal {
    --c-panel: #13161e;
    --c-border: rgba(255, 255, 255, 0.07);
    --c-text: #e2e8f0;
    --c-muted: #6b7280;
    --c-red: #ef4444;
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 10px;
    padding: 24px;
    width: 400px;
    max-width: 95vw;
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: var(--c-text);
  }
  .modal-title { font-size: 0.95rem; font-weight: 600; }
  .modal-warn { font-size: 0.84rem; color: var(--c-muted); }
  .modal-btns { display: flex; justify-content: flex-end; gap: 8px; }
</style>
