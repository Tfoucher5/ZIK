<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { getContext } from 'svelte';
  import TrackPickerModal from '$lib/components/admin/TrackPickerModal.svelte';

  let { data, form } = $props();
  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  const playlist = $derived(data.playlist);
  const tracks   = $derived(data.tracks);

  let deletePlaylistModal = $state(false);
  let editMetaModal = $state(null); // track object
  let pickerOpen = $state(false);
  let addingTrack = $state(false);
  let searchQuery = $state('');

  const filteredTracks = $derived.by(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter((t) => {
      const artist = (t.custom_artist || t.artist || '').toLowerCase();
      const title = (t.custom_title || t.title || '').toLowerCase();
      const feats = (t.custom_feats || []).join(' ').toLowerCase();
      return artist.includes(q) || title.includes(q) || feats.includes(q);
    });
  });

  function fmt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR');
  }

  async function addTrack(track) {
    pickerOpen = false;
    addingTrack = true;
    const fd = new FormData();
    fd.set('_token', token);
    fd.set('track_id', track.id);
    await fetch(`/admin/playlists/${playlist.id}?/addTrack`, { method: 'POST', body: fd });
    addingTrack = false;
    invalidateAll();
  }
</script>

<div class="zk">
  <a href="/admin/playlists" class="back">← Retour</a>

  <div class="panel pl-header">
    <div class="pl-title">{playlist.emoji} {playlist.name}</div>
    <div class="pl-meta">
      <span class="meta-item">Propriétaire : <strong>{playlist.profiles?.username ?? '—'}</strong></span>
      <span class="meta-item">Tracks : <strong>{playlist.track_count}</strong></span>
      <span class="meta-item">Créée : <strong>{fmt(playlist.created_at)}</strong></span>
      <span class="meta-item">MàJ : <strong>{fmt(playlist.updated_at)}</strong></span>
      {#if playlist.is_official}<span class="tag tag-amber">★ Officielle</span>{/if}
      {#if !playlist.is_public}<span class="tag">🔒 Privée</span>{/if}
    </div>
  </div>

  {#if form && !form.success}
    <div class="alert alert-err">{form.error ?? 'Action échouée'}</div>
  {/if}
  {#if form?.success}
    <div class="alert alert-ok">Action appliquée.</div>
  {/if}

  <div class="panel">
    <div class="panel-head">
      <span class="panel-label">Tracks</span>
      <span class="panel-sub">{filteredTracks.length} / {tracks.length}</span>
      <button class="btn btn-primary panel-head-action" onclick={() => pickerOpen = true} disabled={addingTrack}>+ Ajouter un morceau</button>
    </div>

    <input
      class="field-input search-input"
      type="text"
      placeholder="Rechercher un artiste, un titre ou un feat…"
      bind:value={searchQuery}
    />

    {#if tracks.length === 0}
      <p class="hint">Aucune track.</p>
    {:else if filteredTracks.length === 0}
      <p class="hint">Aucun résultat pour « {searchQuery} ».</p>
    {:else}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pos</th>
              <th>Artiste</th>
              <th>Titre</th>
              <th>Source</th>
              <th>Extrait</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each filteredTracks as t, i (t.id)}
              <tr>
                <td class="td-dim">{t.position}</td>
                <td class="td-strong">
                  {t.custom_artist || t.artist}
                  {#if t.custom_artist}<span class="custom-badge" title="Nom custom">✎</span>{/if}
                </td>
                <td>
                  {t.custom_title || t.title}
                  {#if t.custom_title}<span class="custom-badge" title="Titre custom">✎</span>{/if}
                  {#if t.custom_feats?.length}<span class="tag feat-tag">feat: {t.custom_feats.join(', ')}</span>{/if}
                </td>
                <td class="td-dim">{t.source}</td>
                <td class="td-dim">
                  {#if t.preview_url}
                    <a href={t.preview_url} target="_blank" rel="noreferrer" class="link">Écouter</a>
                  {:else}
                    —
                  {/if}
                </td>
                <td class="td-actions">
                  {#if !searchQuery.trim()}
                  <!-- Réordonner ▲ -->
                  <form method="POST" action="?/reorderTrack" use:enhance={() => async ({ update }) => { await update({ reset: false }); }}>
                    <input type="hidden" name="_token" value={token}>
                    <input type="hidden" name="track_id" value={t.id}>
                    <input type="hidden" name="direction" value="up">
                    <button class="icon-btn" disabled={i === 0}>▲</button>
                  </form>
                  <!-- Réordonner ▼ -->
                  <form method="POST" action="?/reorderTrack" use:enhance={() => async ({ update }) => { await update({ reset: false }); }}>
                    <input type="hidden" name="_token" value={token}>
                    <input type="hidden" name="track_id" value={t.id}>
                    <input type="hidden" name="direction" value="down">
                    <button class="icon-btn" disabled={i === filteredTracks.length - 1}>▼</button>
                  </form>
                  {/if}
                  <button class="link" onclick={() => editMetaModal = { ...t }}>Éditer</button>
                  <form method="POST" action="?/deleteTrack" use:enhance={() => async ({ update }) => { await update({ reset: false }); }}>
                    <input type="hidden" name="_token" value={token}>
                    <input type="hidden" name="track_id" value={t.id}>
                    <button class="link link-danger">Supprimer</button>
                  </form>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <div class="panel panel-danger">
    <div class="panel-head"><span class="panel-label">Zone dangereuse</span></div>
    <button class="btn btn-danger" onclick={() => deletePlaylistModal = true}>
      Supprimer la playlist
    </button>
  </div>
</div>

{#if pickerOpen}
  <TrackPickerModal onPick={addTrack} onClose={() => pickerOpen = false} />
{/if}

<!-- Modal edit track meta -->
{#if editMetaModal}
  <div class="modal-overlay" onclick={() => editMetaModal = null} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
      <div class="modal-title">Éditer les métadonnées</div>
      <p class="modal-sub">{editMetaModal.artist} — {editMetaModal.title}</p>
      <form method="POST" action="?/editTrackMeta" use:enhance={() => async ({ update }) => { await update({ reset: false }); editMetaModal = null; }}>
        <input type="hidden" name="_token" value={token}>
        <input type="hidden" name="track_id" value={editMetaModal.id}>
        <label class="field">
          <span class="field-label">Artiste custom (vide = original)</span>
          <input class="field-input" type="text" name="custom_artist" value={editMetaModal.custom_artist ?? ''} placeholder={editMetaModal.artist}>
        </label>
        <label class="field">
          <span class="field-label">Titre custom (vide = original)</span>
          <input class="field-input" type="text" name="custom_title" value={editMetaModal.custom_title ?? ''} placeholder={editMetaModal.title}>
        </label>
        <label class="field">
          <span class="field-label">Featurings / noms alternatifs (séparés par des virgules)</span>
          <input class="field-input" type="text" name="custom_feats" value={editMetaModal.custom_feats?.join(', ') ?? ''} placeholder="ex: feat. Nekfeu, film: Titanic">
        </label>
        <div class="modal-btns">
          <button type="button" class="btn" onclick={() => editMetaModal = null}>Annuler</button>
          <button type="submit" class="btn btn-primary">Enregistrer</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Modal delete playlist -->
{#if deletePlaylistModal}
  <div class="modal-overlay" onclick={() => deletePlaylistModal = false} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
      <div class="modal-title">Supprimer la playlist</div>
      <p class="modal-warn">
        Supprimer définitivement <strong>{playlist.emoji} {playlist.name}</strong> et ses {playlist.track_count} tracks ?
      </p>
      <form method="POST" action="?/deletePlaylist" use:enhance>
        <input type="hidden" name="_token" value={token}>
        <div class="modal-btns">
          <button type="button" class="btn" onclick={() => deletePlaylistModal = false}>Annuler</button>
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

  .back { font-size: 0.8rem; color: var(--c-muted); transition: color 0.15s; width: fit-content; }
  .back:hover { color: var(--c-text); }

  .panel {
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 10px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .panel-danger { border-color: rgba(239, 68, 68, 0.25); }
  .panel-head { display: flex; align-items: baseline; gap: 10px; }
  .panel-head-action { margin-left: auto; }
  .panel-label { font-size: 0.82rem; font-weight: 600; color: var(--c-text); }
  .panel-sub { font-size: 0.75rem; color: var(--c-muted); }

  .pl-title { font-size: 1.15rem; font-weight: 600; }
  .pl-meta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .meta-item { font-size: 0.78rem; color: var(--c-muted); }
  .meta-item strong { color: var(--c-text); }

  .hint { font-size: 0.82rem; color: var(--c-muted); }

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
  .td-actions { display: flex; gap: 8px; align-items: center; }

  .custom-badge { font-size: 0.68rem; color: var(--c-amber); margin-left: 4px; }
  .tag { font-size: 0.72rem; font-weight: 500; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--c-border); color: var(--c-muted); }
  .tag-amber { color: var(--c-amber); border-color: rgba(245, 158, 11, 0.3); }
  .feat-tag { margin-left: 6px; }

  .link { background: none; border: none; font-family: inherit; font-size: 0.8rem; color: var(--c-muted); cursor: pointer; padding: 0; transition: color 0.15s; }
  .link:hover { color: var(--c-text); }
  .link-danger { color: rgba(239, 68, 68, 0.6); }
  .link-danger:hover { color: var(--c-red); }

  .icon-btn {
    background: transparent;
    border: 1px solid var(--c-border);
    border-radius: 4px;
    color: var(--c-muted);
    font-size: 0.68rem;
    padding: 2px 6px;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }
  .icon-btn:hover:not(:disabled) { color: var(--c-text); border-color: rgba(255, 255, 255, 0.2); }
  .icon-btn:disabled { opacity: 0.25; cursor: not-allowed; }

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
    width: fit-content;
  }
  .btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.15); }
  .btn-primary { border-color: rgba(99, 102, 241, 0.4); color: var(--c-indigo); }
  .btn-primary:hover:not(:disabled) { background: rgba(99, 102, 241, 0.08); border-color: rgba(99, 102, 241, 0.6); }
  .btn-danger { border-color: rgba(239, 68, 68, 0.3); color: var(--c-red); }
  .btn-danger:hover:not(:disabled) { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.5); }

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
    width: 420px;
    max-width: 95vw;
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: var(--c-text);
  }
  .modal-title { font-size: 0.95rem; font-weight: 600; }
  .modal-sub { font-size: 0.8rem; color: var(--c-muted); }
  .modal-warn { font-size: 0.84rem; color: var(--c-muted); }
  .modal-warn strong { color: var(--c-text); }

  .field { display: flex; flex-direction: column; gap: 5px; }
  .field-label { font-size: 0.72rem; color: var(--c-muted); }
  .field-input {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--c-border);
    border-radius: 6px;
    color: var(--c-text);
    font-family: inherit;
    font-size: 0.84rem;
    padding: 7px 10px;
    outline: none;
  }
  .field-input:focus { border-color: rgba(255, 255, 255, 0.2); }
  .field-input::placeholder { color: var(--c-muted); }
  .search-input { width: 100%; }

  .modal-btns { display: flex; justify-content: flex-end; gap: 8px; }
</style>
