<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { getContext } from 'svelte';
  import TrackPickerModal from '$lib/components/admin/TrackPickerModal.svelte';

  let { data, form } = $props();
  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  let pickerOpen = $state(false);
  let deleteAllModal = $state(false);
  let deleteResultModal = $state(null);
  let busy = $state(false);

  function fmt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-FR');
  }

  async function pickTrack(track) {
    pickerOpen = false;
    busy = true;
    const fd = new FormData();
    fd.set('_token', token);
    fd.set('date', data.date);
    fd.set('track_id', track.id);
    await fetch(`/admin/zikle/${data.date}?/setTrack`, { method: 'POST', body: fd });
    busy = false;
    invalidateAll();
  }
</script>

<div class="zk">
  <a href="/admin/zikle" class="back">← Retour</a>

  <div class="zk-head">
    <h1>Zikle #{data.dayNumber}</h1>
    <span class="zk-date">{data.date}</span>
  </div>

  {#if form && !form.success}
    <div class="alert alert-err">{form.error ?? 'Action échouée'}</div>
  {/if}
  {#if form?.success}
    <div class="alert alert-ok">Action appliquée.</div>
  {/if}

  <div class="panel">
    <div class="panel-head">
      <span class="panel-label">Morceau</span>
    </div>
    <div class="track-row">
      {#if data.daily.tracks?.cover_url}
        <img src={data.daily.tracks.cover_url} alt="" class="cover" />
      {/if}
      <div class="track-name">{data.daily.tracks?.artist} — {data.daily.tracks?.title}</div>
    </div>
    <div class="actions">
      <button class="btn" onclick={() => pickerOpen = true} disabled={busy}>Changer le morceau</button>
      {#if data.results.length > 0}
        <button class="btn btn-danger" onclick={() => deleteAllModal = true}>Réinitialiser tous les résultats</button>
      {/if}
    </div>
  </div>

  <div class="panel">
    <div class="panel-head">
      <span class="panel-label">Résultats</span>
      <span class="panel-sub">{data.results.length} joueurs</span>
    </div>

    {#if data.results.length === 0}
      <p class="hint">Aucun résultat pour ce jour.</p>
    {:else}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Joueur</th>
              <th>Essais</th>
              <th>Gagné</th>
              <th>Temps</th>
              <th>Joué à</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each data.results as r (r.id)}
              <tr>
                <td class="td-strong">{r.profiles?.username ?? r.user_id}</td>
                <td class="td-num">{r.attempts}/6</td>
                <td>
                  <span class="tag" class:tag-green={r.won} class:tag-red={!r.won}>{r.won ? 'Oui' : 'Non'}</span>
                </td>
                <td class="td-dim">{r.solve_time_seconds ? `${r.solve_time_seconds}s` : '—'}</td>
                <td class="td-dim">{fmt(r.created_at)}</td>
                <td class="td-actions">
                  <button class="link link-danger" onclick={() => deleteResultModal = r}>Supprimer</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

{#if pickerOpen}
  <TrackPickerModal onPick={pickTrack} onClose={() => pickerOpen = false} />
{/if}

{#if deleteAllModal}
  <div class="modal-overlay" onclick={() => deleteAllModal = false} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
      <div class="modal-title">Réinitialiser tous les résultats</div>
      <p class="modal-warn">Supprimer les {data.results.length} résultats du <strong>{data.date}</strong> ?</p>
      <form method="POST" action="?/deleteAllResults" use:enhance={() => async ({ update }) => { await update({ reset: false }); deleteAllModal = false; }}>
        <input type="hidden" name="_token" value={token}>
        <input type="hidden" name="date" value={data.date}>
        <div class="modal-btns">
          <button type="button" class="btn" onclick={() => deleteAllModal = false}>Annuler</button>
          <button type="submit" class="btn btn-danger">Supprimer</button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if deleteResultModal}
  <div class="modal-overlay" onclick={() => deleteResultModal = null} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
      <div class="modal-title">Supprimer le résultat</div>
      <p class="modal-warn">Supprimer le résultat de <strong>{deleteResultModal.profiles?.username ?? deleteResultModal.user_id}</strong> ?</p>
      <form method="POST" action="?/deleteResult" use:enhance={() => async ({ update }) => { await update({ reset: false }); deleteResultModal = null; }}>
        <input type="hidden" name="_token" value={token}>
        <input type="hidden" name="id" value={deleteResultModal.id}>
        <div class="modal-btns">
          <button type="button" class="btn" onclick={() => deleteResultModal = null}>Annuler</button>
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
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-family: 'Inter', system-ui, sans-serif;
    color: var(--c-text);
  }

  .back { font-size: 0.8rem; color: var(--c-muted); transition: color 0.15s; width: fit-content; }
  .back:hover { color: var(--c-text); }

  .zk-head { display: flex; align-items: baseline; gap: 12px; }
  .zk-head h1 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; }
  .zk-date { font-size: 0.78rem; color: var(--c-muted); }

  .panel {
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 10px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .panel-head { display: flex; align-items: baseline; gap: 10px; }
  .panel-label { font-size: 0.82rem; font-weight: 600; color: var(--c-text); }
  .panel-sub { font-size: 0.75rem; color: var(--c-muted); }

  .track-row { display: flex; align-items: center; gap: 12px; }
  .cover { width: 48px; height: 48px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
  .track-name { font-weight: 600; font-size: 0.9rem; }

  .hint { font-size: 0.82rem; color: var(--c-muted); }

  .actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

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
  .btn-danger { border-color: rgba(239, 68, 68, 0.3); color: var(--c-red); }
  .btn-danger:hover:not(:disabled) { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.5); }

  .link { background: none; border: none; font-family: inherit; font-size: 0.8rem; color: var(--c-muted); cursor: pointer; padding: 0; transition: color 0.15s; }
  .link:hover { color: var(--c-text); }
  .link-danger { color: rgba(239, 68, 68, 0.6); }
  .link-danger:hover { color: var(--c-red); }

  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
  th {
    text-align: left;
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--c-muted);
    padding: 8px 12px;
    border-bottom: 1px solid var(--c-border);
  }
  td { padding: 9px 12px; border-bottom: 1px solid var(--c-border); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255, 255, 255, 0.02); }

  .td-strong { font-weight: 500; }
  .td-dim { color: var(--c-muted); font-size: 0.8rem; }
  .td-num { font-family: 'JetBrains Mono', monospace; }
  .td-actions { text-align: right; }

  .tag { font-size: 0.72rem; font-weight: 500; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--c-border); color: var(--c-muted); }
  .tag-green { color: var(--c-green); border-color: rgba(34, 197, 94, 0.3); }
  .tag-red { color: var(--c-red); border-color: rgba(239, 68, 68, 0.3); }

  .alert { font-size: 0.84rem; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--c-border); }
  .alert-err { color: var(--c-red); border-color: rgba(239, 68, 68, 0.3); }
  .alert-ok { color: var(--c-green); border-color: rgba(34, 197, 94, 0.3); }

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
    font-family: 'Inter', system-ui, sans-serif;
  }
  .modal-title { font-size: 0.95rem; font-weight: 600; }
  .modal-warn { font-size: 0.84rem; color: var(--c-muted); }
  .modal-warn strong { color: var(--c-text); }
  .modal-btns { display: flex; justify-content: flex-end; gap: 8px; }
</style>
