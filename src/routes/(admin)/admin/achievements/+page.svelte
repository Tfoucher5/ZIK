<script>
  import { enhance } from '$app/forms';
  import { getContext } from 'svelte';

  let { data, form } = $props();
  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  const TYPES = ['one_time', 'tiered'];
  const RARITIES = ['common', 'rare', 'epic', 'legendary'];
  const CATEGORIES = ['streak', 'wins', 'score', 'social'];

  let defModal = $state(null); // { mode: 'create'|'edit', id, name, description, icon, type, rarity, category, tiersJson }
  let deleteModal = $state(null); // achievement object
  let grantModal = $state(false);
  let revokeModal = $state(null); // unlock object

  function openCreate() {
    defModal = {
      mode: 'create',
      id: '', name: '', description: '', icon: '🏅',
      type: 'one_time', rarity: 'common', category: 'wins',
      tiersJson: '[\n  { "level": "bronze", "target": 10, "rarity": "common" },\n  { "level": "silver", "target": 50, "rarity": "rare" },\n  { "level": "gold", "target": 200, "rarity": "epic" }\n]',
    };
  }
  function openEdit(a) {
    defModal = {
      mode: 'edit',
      id: a.id, name: a.name, description: a.description, icon: a.icon,
      type: a.type, rarity: a.rarity, category: a.category,
      tiersJson: a.tiers ? JSON.stringify(a.tiers, null, 2) : '[]',
    };
  }

  function fmt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="zk">
  <div class="zk-head">
    <h1>Achievements</h1>
    <span class="zk-date">{data.achievements.length} succès · {data.unlocks.length} déblocages récents</span>
  </div>

  {#if form && !form.success}
    <div class="alert alert-err">{form.error ?? 'Action échouée'}</div>
  {/if}
  {#if form?.success}
    <div class="alert alert-ok">Action appliquée.</div>
  {/if}

  {#if data.error}
    <div class="alert alert-err">{data.error}</div>
  {/if}

  <div class="panel">
    <div class="panel-head">
      <span class="panel-label">Catalogue</span>
      <button class="btn btn-primary panel-head-action" onclick={openCreate}>+ Nouveau succès</button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Nom</th>
            <th>ID</th>
            <th>Catégorie</th>
            <th>Rareté</th>
            <th>Type</th>
            <th>Détenteurs</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each data.achievements as a (a.id)}
            <tr>
              <td class="td-icon">{a.icon}</td>
              <td class="td-strong">{a.name}</td>
              <td class="td-dim td-mono">{a.id}</td>
              <td class="td-dim">{a.category}</td>
              <td><span class="tag" class:tag-amber={a.rarity === 'legendary'} class:tag-indigo={a.rarity === 'epic'}>{a.rarity}</span></td>
              <td class="td-dim">{a.type === 'tiered' ? 'Paliers' : 'Unique'}</td>
              <td class="td-num">{a.holders}</td>
              <td class="td-actions">
                <button class="link" onclick={() => openEdit(a)}>Éditer</button>
                <button class="link link-danger" onclick={() => deleteModal = a}>Supprimer</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <div class="panel">
    <div class="panel-head">
      <span class="panel-label">Déblocages récents</span>
      <button class="btn btn-primary panel-head-action" onclick={() => grantModal = true}>+ Attribuer manuellement</button>
    </div>

    {#if data.unlocks.length === 0}
      <p class="hint">Aucun déblocage.</p>
    {:else}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Joueur</th>
              <th>Succès</th>
              <th>Palier</th>
              <th>Débloqué le</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each data.unlocks as u (u.id)}
              <tr>
                <td class="td-strong">{u.profiles?.username ?? u.user_id}</td>
                <td>{u.achievements?.icon} {u.achievements?.name ?? u.achievement_id}</td>
                <td class="td-dim">{u.tier ?? '—'}</td>
                <td class="td-dim">{fmt(u.unlocked_at)}</td>
                <td class="td-actions">
                  <button class="link link-danger" onclick={() => revokeModal = u}>Révoquer</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<!-- Modal create/edit achievement -->
{#if defModal}
  <div class="modal-overlay" onclick={() => defModal = null} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
      <div class="modal-title">{defModal.mode === 'create' ? 'Nouveau succès' : `Éditer ${defModal.id}`}</div>
      <form method="POST" action={defModal.mode === 'create' ? '?/createAchievement' : '?/editAchievement'} use:enhance={() => async ({ result, update }) => { if (result.type === 'success') defModal = null; await update({ reset: false }); }}>
        <input type="hidden" name="_token" value={token}>
        {#if defModal.mode === 'create'}
          <label class="field">
            <span class="field-label">ID (identifiant technique, doit correspondre à la logique du jeu pour se déclencher)</span>
            <input class="field-input" type="text" name="id" bind:value={defModal.id} required>
          </label>
        {:else}
          <input type="hidden" name="id" value={defModal.id}>
          <label class="field">
            <span class="field-label">ID</span>
            <input class="field-input" type="text" value={defModal.id} disabled>
          </label>
        {/if}
        <label class="field">
          <span class="field-label">Nom</span>
          <input class="field-input" type="text" name="name" bind:value={defModal.name} required>
        </label>
        <label class="field">
          <span class="field-label">Description</span>
          <input class="field-input" type="text" name="description" bind:value={defModal.description}>
        </label>
        <div class="field-row">
          <label class="field">
            <span class="field-label">Icône</span>
            <input class="field-input field-icon" type="text" name="icon" bind:value={defModal.icon} maxlength="4">
          </label>
          <label class="field">
            <span class="field-label">Catégorie</span>
            <select class="field-input" name="category" bind:value={defModal.category}>
              {#each CATEGORIES as c (c)}<option value={c}>{c}</option>{/each}
            </select>
          </label>
          <label class="field">
            <span class="field-label">Rareté</span>
            <select class="field-input" name="rarity" bind:value={defModal.rarity}>
              {#each RARITIES as r (r)}<option value={r}>{r}</option>{/each}
            </select>
          </label>
        </div>
        <label class="field">
          <span class="field-label">Type</span>
          <select class="field-input" name="type" bind:value={defModal.type}>
            {#each TYPES as t (t)}<option value={t}>{t === 'tiered' ? 'Paliers (bronze/argent/or)' : 'Unique'}</option>{/each}
          </select>
        </label>
        {#if defModal.type === 'tiered'}
          <label class="field">
            <span class="field-label">Paliers (JSON — level, target, rarity)</span>
            <textarea class="field-input field-json" name="tiers_json" rows="6" bind:value={defModal.tiersJson}></textarea>
          </label>
        {/if}
        <div class="modal-btns">
          <button type="button" class="btn" onclick={() => defModal = null}>Annuler</button>
          <button type="submit" class="btn btn-primary">Enregistrer</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Modal delete achievement -->
{#if deleteModal}
  <div class="modal-overlay" onclick={() => deleteModal = null} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
      <div class="modal-title">Supprimer le succès</div>
      <p class="modal-warn">
        Supprimer <strong>{deleteModal.icon} {deleteModal.name}</strong> ?
        {#if deleteModal.holders > 0}<br>{deleteModal.holders} joueur{deleteModal.holders === 1 ? '' : 's'} le possède{deleteModal.holders === 1 ? '' : 'nt'} — ces déblocages seront supprimés aussi.{/if}
      </p>
      <form method="POST" action="?/deleteAchievement" use:enhance={() => async ({ update }) => { await update({ reset: false }); deleteModal = null; }}>
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

<!-- Modal grant unlock -->
{#if grantModal}
  <div class="modal-overlay" onclick={() => grantModal = false} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
      <div class="modal-title">Attribuer un succès</div>
      <form method="POST" action="?/grantUnlock" use:enhance={() => async ({ update }) => { await update({ reset: false }); grantModal = false; }}>
        <input type="hidden" name="_token" value={token}>
        <label class="field">
          <span class="field-label">Pseudo du joueur</span>
          <input class="field-input" type="text" name="username" required>
        </label>
        <label class="field">
          <span class="field-label">Succès</span>
          <select class="field-input" name="achievement_id">
            {#each data.achievements as a (a.id)}
              <option value={a.id}>{a.icon} {a.name}</option>
            {/each}
          </select>
        </label>
        <label class="field">
          <span class="field-label">Palier (laisser vide si succès unique)</span>
          <input class="field-input" type="text" name="tier" placeholder="bronze / silver / gold">
        </label>
        <div class="modal-btns">
          <button type="button" class="btn" onclick={() => grantModal = false}>Annuler</button>
          <button type="submit" class="btn btn-primary">Attribuer</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Modal revoke unlock -->
{#if revokeModal}
  <div class="modal-overlay" onclick={() => revokeModal = null} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
      <div class="modal-title">Révoquer le succès</div>
      <p class="modal-warn">Retirer <strong>{revokeModal.achievements?.name}</strong> à <strong>{revokeModal.profiles?.username}</strong> ?</p>
      <form method="POST" action="?/revokeUnlock" use:enhance={() => async ({ update }) => { await update({ reset: false }); revokeModal = null; }}>
        <input type="hidden" name="_token" value={token}>
        <input type="hidden" name="id" value={revokeModal.id}>
        <div class="modal-btns">
          <button type="button" class="btn" onclick={() => revokeModal = null}>Annuler</button>
          <button type="submit" class="btn btn-danger">Révoquer</button>
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
  .panel-head-action { margin-left: auto; }

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

  .td-icon { font-size: 1.1rem; }
  .td-strong { font-weight: 500; }
  .td-dim { color: var(--c-muted); font-size: 0.8rem; }
  .td-mono { font-family: 'JetBrains Mono', monospace; }
  .td-num { font-family: 'JetBrains Mono', monospace; }
  .td-actions { display: flex; gap: 10px; }

  .tag { font-size: 0.72rem; font-weight: 500; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--c-border); color: var(--c-muted); }
  .tag-amber { color: var(--c-amber); border-color: rgba(245, 158, 11, 0.3); }
  .tag-indigo { color: var(--c-indigo); border-color: rgba(99, 102, 241, 0.3); }

  .link { background: none; border: none; font-family: inherit; font-size: 0.8rem; color: var(--c-muted); cursor: pointer; padding: 0; transition: color 0.15s; }
  .link:hover { color: var(--c-text); }
  .link-danger { color: rgba(239, 68, 68, 0.6); }
  .link-danger:hover { color: var(--c-red); }

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
    padding: 20px;
  }
  .modal {
    --c-panel: #13161e;
    --c-border: rgba(255, 255, 255, 0.07);
    --c-text: #e2e8f0;
    --c-muted: #6b7280;
    --c-red: #ef4444;
    --c-indigo: #6366f1;
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 10px;
    padding: 24px;
    width: 440px;
    max-width: 95vw;
    max-height: 90vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: var(--c-text);
  }
  .modal form { display: flex; flex-direction: column; gap: 12px; }
  .modal-title { font-size: 0.95rem; font-weight: 600; }
  .modal-warn { font-size: 0.84rem; color: var(--c-muted); line-height: 1.5; }
  .modal-warn strong { color: var(--c-text); }

  .field { display: flex; flex-direction: column; gap: 5px; flex: 1; }
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
  .field-input:disabled { opacity: 0.5; }
  .field-icon { width: 60px; text-align: center; }
  .field-json { font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; resize: vertical; }
  .field-row { display: flex; gap: 10px; }

  .modal-btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
</style>
