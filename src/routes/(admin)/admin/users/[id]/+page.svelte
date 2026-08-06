<script>
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { getContext } from 'svelte';

  let { data, form } = $props();

  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  const profile     = $derived(data.profile);
  const games       = $derived(data.games);
  const reports     = $derived(data.reports);
  const isBanned    = $derived(data.isBanned);
  const following   = $derived(data.following);
  const followers   = $derived(data.followers);
  const friendships = $derived(data.friendships);

  let confirmUsername = $state('');
  let showDeleteModal = $state(false);
  let showResetModal = $state(false);
  let banDuration = $state('87600h');

  function fmt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  $effect(() => {
    if (form?.deleted) goto('/admin/users');
  });
</script>

<div class="zk">
  <a href="/admin/users" class="back">← Retour</a>

  <div class="panel user-header">
    <img src={profile.avatar_url || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${profile.username}`} alt="" class="avatar">
    <div class="user-info">
      <div class="user-name">
        {profile.username}
        <a href="/user/{profile.username}" target="_blank" rel="noreferrer" class="link">↗ Profil public</a>
      </div>
      <div class="user-meta">
        <span class="tag" class:tag-amber={profile.role === 'super_admin'}>{profile.role === 'super_admin' ? 'Admin' : 'User'}</span>
        {#if isBanned}<span class="tag tag-red">Banni</span>{/if}
        <span class="user-id">ID: {profile.id}</span>
      </div>
    </div>
    <div class="stat-grid">
      <div class="stat-block"><span class="stat-lbl">ELO</span><span class="stat-val">{profile.elo}</span></div>
      <div class="stat-block"><span class="stat-lbl">XP</span><span class="stat-val">{profile.xp}</span></div>
      <div class="stat-block"><span class="stat-lbl">Niveau</span><span class="stat-val">{profile.level}</span></div>
      <div class="stat-block"><span class="stat-lbl">Parties</span><span class="stat-val">{profile.games_played}</span></div>
    </div>
  </div>

  {#if form && !form.success}
    <div class="alert alert-err">{form.error ?? 'Action échouée'}</div>
  {/if}
  {#if form?.success && !form?.deleted}
    <div class="alert alert-ok">Action appliquée.</div>
  {/if}

  <div class="grid">

    <div class="panel">
      <div class="panel-head"><span class="panel-label">Bannissement</span></div>
      {#if isBanned}
        <form method="POST" action="?/unban" use:enhance>
          <input type="hidden" name="_token" value={token}>
          <button class="btn btn-ok">Débannir</button>
        </form>
      {:else}
        <form method="POST" action="?/ban" use:enhance class="form-inline">
          <input type="hidden" name="_token" value={token}>
          <label class="field">
            <span class="field-label">Durée</span>
            <select name="duration" bind:value={banDuration} class="field-input">
              <option value="24h">24 heures</option>
              <option value="168h">7 jours</option>
              <option value="720h">30 jours</option>
              <option value="8760h">1 an</option>
              <option value="87600h">10 ans</option>
            </select>
          </label>
          <button class="btn btn-danger">Bannir</button>
        </form>
      {/if}
    </div>

    <div class="panel">
      <div class="panel-head"><span class="panel-label">Statistiques</span></div>
      <form method="POST" action="?/editStats" use:enhance class="form-inline">
        <input type="hidden" name="_token" value={token}>
        <label class="field"><span class="field-label">XP</span><input class="field-input" type="number" name="xp" value={profile.xp} min="0"></label>
        <label class="field"><span class="field-label">ELO</span><input class="field-input" type="number" name="elo" value={profile.elo} min="0"></label>
        <label class="field"><span class="field-label">Niveau</span><input class="field-input" type="number" name="level" value={profile.level} min="1"></label>
        <button class="btn btn-primary">Appliquer</button>
      </form>
    </div>

    <div class="panel">
      <div class="panel-head"><span class="panel-label">Pseudo</span></div>
      <form method="POST" action="?/editUsername" use:enhance class="form-inline">
        <input type="hidden" name="_token" value={token}>
        <label class="field"><span class="field-label">Nouveau pseudo</span><input class="field-input" type="text" name="username" value={profile.username} minlength="3" maxlength="20"></label>
        <button class="btn btn-primary">Renommer</button>
      </form>
    </div>

    <div class="panel">
      <div class="panel-head"><span class="panel-label">Réinitialiser les stats</span></div>
      <p class="hint">Remet XP=0, ELO=1000, Niveau=1, parties=0, score=0.</p>
      {#if showResetModal}
        <form method="POST" action="?/resetStats" use:enhance onsubmit={() => showResetModal = false}>
          <input type="hidden" name="_token" value={token}>
          <div class="actions">
            <button class="btn btn-danger">Confirmer</button>
            <button type="button" class="btn" onclick={() => showResetModal = false}>Annuler</button>
          </div>
        </form>
      {:else}
        <button class="btn btn-danger" onclick={() => showResetModal = true}>Réinitialiser</button>
      {/if}
    </div>

    <div class="panel">
      <div class="panel-head"><span class="panel-label">Rôle</span></div>
      <form method="POST" action="?/setRole" use:enhance class="form-inline">
        <input type="hidden" name="_token" value={token}>
        <select name="role" class="field-input">
          <option value="user" selected={profile.role === 'user'}>User</option>
          <option value="super_admin" selected={profile.role === 'super_admin'}>Admin (super_admin)</option>
        </select>
        <button class="btn btn-primary">Définir</button>
      </form>
    </div>

    <div class="panel panel-danger">
      <div class="panel-head"><span class="panel-label">Supprimer le compte</span></div>
      <p class="hint">Suppression définitive et irréversible.</p>
      <button class="btn btn-danger" onclick={() => showDeleteModal = true}>Supprimer le compte</button>
    </div>

  </div>

  {#if showDeleteModal}
    <div class="modal-overlay" onclick={() => showDeleteModal = false} role="presentation">
      <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
        <div class="modal-title">Supprimer le compte</div>
        <p class="modal-warn">Tape le pseudo <strong>{profile.username}</strong> pour confirmer.</p>
        <form method="POST" action="?/deleteUser" use:enhance>
          <input type="hidden" name="_token" value={token}>
          <input class="field-input" type="text" name="confirm_username" bind:value={confirmUsername} placeholder={profile.username} autocomplete="off">
          <div class="modal-btns">
            <button type="button" class="btn" onclick={() => showDeleteModal = false}>Annuler</button>
            <button class="btn btn-danger" disabled={confirmUsername !== profile.username}>Confirmer la suppression</button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <div class="grid">
    <div class="panel">
      <div class="panel-head"><span class="panel-label">Suit ({following.length})</span></div>
      {#if following.length === 0}
        <p class="hint">Ne suit personne.</p>
      {:else}
        <div class="history-list">
          {#each following as f (f.id)}
            <div class="history-row">
              <span class="td-strong">{f.profiles?.username ?? '—'}</span>
              <form method="POST" action="?/deleteFollow" use:enhance={() => async ({ update }) => { await update({ reset: false }); }}>
                <input type="hidden" name="_token" value={token}>
                <input type="hidden" name="id" value={f.id}>
                <button class="link link-danger">Retirer</button>
              </form>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="panel">
      <div class="panel-head"><span class="panel-label">Suivi par ({followers.length})</span></div>
      {#if followers.length === 0}
        <p class="hint">Personne ne le suit.</p>
      {:else}
        <div class="history-list">
          {#each followers as f (f.id)}
            <div class="history-row">
              <span class="td-strong">{f.profiles?.username ?? '—'}</span>
              <form method="POST" action="?/deleteFollow" use:enhance={() => async ({ update }) => { await update({ reset: false }); }}>
                <input type="hidden" name="_token" value={token}>
                <input type="hidden" name="id" value={f.id}>
                <button class="link link-danger">Retirer</button>
              </form>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="panel">
    <div class="panel-head"><span class="panel-label">Amitiés</span><span class="panel-sub">{friendships.length}</span></div>
    {#if friendships.length === 0}
      <p class="hint">Aucune amitié.</p>
    {:else}
      <div class="history-list">
        {#each friendships as f (f.id)}
          <div class="history-row">
            <span class="td-strong">{f.other_username ?? '—'}</span>
            <span class="tag" class:tag-amber={f.status === 'pending'}>{f.status === 'accepted' ? 'Amis' : 'En attente'}</span>
            <span class="td-dim history-date">{fmt(f.accepted_at ?? f.created_at)}</span>
            <form method="POST" action="?/deleteFriendship" use:enhance={() => async ({ update }) => { await update({ reset: false }); }}>
              <input type="hidden" name="_token" value={token}>
              <input type="hidden" name="id" value={f.id}>
              <button class="link link-danger">Supprimer</button>
            </form>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="panel">
    <div class="panel-head"><span class="panel-label">Historique de parties</span><span class="panel-sub">{games.length}</span></div>
    {#if games.length === 0}
      <p class="hint">Aucune partie.</p>
    {:else}
      <div class="history-list">
        {#each games as g (g.id)}
          <div class="history-row">
            <span class="td-strong">{g.games?.room_id ?? '?'}</span>
            <span class="td-dim">score: {g.score}</span>
            <span class="td-dim">{g.rank ? `#${g.rank}` : '—'}</span>
            <span class="td-dim history-date">{fmt(g.games?.started_at)}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="panel">
    <div class="panel-head"><span class="panel-label">Signalements</span><span class="panel-sub">{reports.length}</span></div>
    {#if reports.length === 0}
      <p class="hint">Aucun signalement.</p>
    {:else}
      <div class="history-list">
        {#each reports as r (r.id)}
          <div class="history-row">
            <span class="td-strong">{r.type}</span>
            <span class="td-dim">{r.status}</span>
            <span class="td-dim">{r.reporter_id === profile.id ? 'auteur' : 'signalé'}</span>
            <span class="td-dim history-date">{fmt(r.created_at)}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

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
  .panel-label { font-size: 0.82rem; font-weight: 600; color: var(--c-text); }
  .panel-sub { font-size: 0.75rem; color: var(--c-muted); }

  .user-header { flex-direction: row; align-items: center; gap: 20px; flex-wrap: wrap; }
  .avatar { width: 56px; height: 56px; border-radius: 10px; flex-shrink: 0; }
  .user-info { flex: 1; min-width: 0; }
  .user-name { font-size: 1.15rem; font-weight: 600; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .user-meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
  .user-id { font-size: 0.72rem; color: var(--c-muted); }

  .stat-grid { display: flex; gap: 20px; }
  .stat-block { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .stat-lbl { font-size: 0.68rem; color: var(--c-muted); }
  .stat-val { font-family: 'JetBrains Mono', monospace; font-size: 1.1rem; font-weight: 600; color: var(--c-text); }

  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }

  .hint { font-size: 0.82rem; color: var(--c-muted); }

  .form-inline { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
  .field { display: flex; flex-direction: column; gap: 5px; width: 100%; }
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

  .link { font-size: 0.75rem; color: var(--c-muted); transition: color 0.15s; }
  .link:hover { color: var(--c-text); }

  .tag { font-size: 0.72rem; font-weight: 500; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--c-border); color: var(--c-muted); }
  .tag-amber { color: var(--c-amber); border-color: rgba(245, 158, 11, 0.3); }
  .tag-red { color: var(--c-red); border-color: rgba(239, 68, 68, 0.3); }

  .alert { font-size: 0.84rem; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--c-border); }
  .alert-err { color: var(--c-red); border-color: rgba(239, 68, 68, 0.3); }
  .alert-ok { color: var(--c-green); border-color: rgba(34, 197, 94, 0.3); }

  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6);
    display: flex; align-items: center; justify-content: center; z-index: 500; padding: 20px;
  }
  .modal {
    --c-panel: #13161e;
    --c-border: rgba(255, 255, 255, 0.07);
    --c-text: #e2e8f0;
    --c-muted: #6b7280;
    --c-red: #ef4444;
    background: var(--c-panel); border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 10px; padding: 24px; max-width: 420px; width: 100%;
    display: flex; flex-direction: column; gap: 16px;
    color: var(--c-text);
  }
  .modal-title { font-size: 0.95rem; font-weight: 600; color: var(--c-red); }
  .modal-warn { font-size: 0.84rem; color: var(--c-muted); line-height: 1.5; }
  .modal-warn strong { color: var(--c-text); }
  .modal-btns { display: flex; gap: 8px; justify-content: flex-end; }

  .history-list { display: flex; flex-direction: column; gap: 4px; }
  .history-row {
    display: flex; align-items: center; gap: 16px;
    font-size: 0.82rem; padding: 8px 10px;
    border-bottom: 1px solid var(--c-border);
  }
  .history-row:last-child { border-bottom: none; }
  .td-strong { font-weight: 500; min-width: 90px; }
  .td-dim { color: var(--c-muted); font-size: 0.78rem; }
  .history-date { margin-left: auto; }
</style>
