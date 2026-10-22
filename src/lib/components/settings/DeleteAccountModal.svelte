<script>
  import { getContext } from 'svelte';
  import Modal from '$lib/components/ui/Modal.svelte';

  const _ctx = getContext('zik');
  const sb = _ctx.sb;
  const user = $derived(_ctx.user);

  let { open = $bindable(false) } = $props();

  let deleteConfirmText = $state('');
  let deleteLoading     = $state(false);
  let deleteError       = $state('');

  $effect(() => {
    if (!open) return;
    // Focus du champ une fois la modale affichée
    setTimeout(() => document.getElementById('delete-confirm-input')?.focus(), 80);
  });

  function closeDeleteModal() {
    if (deleteLoading) return;
    open = false;
    deleteConfirmText = '';
    deleteError = '';
  }

  async function confirmDeleteAccount() {
    if (!sb || !user) return;
    const expectedUsername = user.profile?.username || user.email?.split('@')[0] || '';
    if (deleteConfirmText.trim() !== expectedUsername) {
      deleteError = 'Le pseudo ne correspond pas.';
      return;
    }
    deleteLoading = true;
    deleteError = '';
    try {
      const { data: { session } } = await sb.auth.getSession();
      const r = await fetch('/api/profile/delete', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const d = await r.json();
      if (!r.ok && !d.partial) throw new Error(d.error || `HTTP ${r.status}`);
      // Déconnexion locale dans tous les cas
      await sb.auth.signOut();
      window.location.href = '/?deleted=1';
    } catch (e) {
      deleteError = e.message;
      deleteLoading = false;
    }
  }
</script>

<Modal {open} onClose={closeDeleteModal} maxWidth="420px">
  <h2 class="delete-modal-title" id="delete-modal-title">&#x1F6A8; Supprimer mon compte</h2>
  <p class="delete-modal-desc">
    Cette action est <strong>irr&eacute;versible</strong>. Ton profil, tes playlists, tes scores et toutes tes donn&eacute;es seront supprim&eacute;s d&eacute;finitivement.
  </p>
  <div class="delete-modal-confirm-label">
    Pour confirmer, tape ton pseudo&nbsp;:
    <strong class="delete-modal-username">{user?.profile?.username || user?.email?.split('@')[0] || '…'}</strong>
  </div>
  <input
    id="delete-confirm-input"
    class="delete-modal-input"
    type="text"
    bind:value={deleteConfirmText}
    placeholder="Ton pseudo ici"
    autocomplete="off"
    spellcheck="false"
    disabled={deleteLoading}
    onkeydown={e => { if (e.key === 'Enter') confirmDeleteAccount(); if (e.key === 'Escape') closeDeleteModal(); }}
  >
  {#if deleteError}
    <p class="delete-modal-error">{deleteError}</p>
  {/if}
  <div class="delete-modal-actions">
    <button class="btn-delete-cancel" onclick={closeDeleteModal} disabled={deleteLoading}>
      Annuler
    </button>
    <button
      class="btn-delete-confirm"
      onclick={confirmDeleteAccount}
      disabled={deleteLoading || deleteConfirmText.trim() !== (user?.profile?.username || user?.email?.split('@')[0] || '')}
    >
      {#if deleteLoading}
        Suppression…
      {:else}
        Supprimer d&eacute;finitivement
      {/if}
    </button>
  </div>
</Modal>

<style>
/* -- Delete modal -- */
.delete-modal-title {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 1.25rem; font-weight: 800;
  color: var(--danger); margin-bottom: 12px;
}
.delete-modal-desc { font-size: 0.88rem; color: var(--mid); line-height: 1.55; margin-bottom: 20px; }
.delete-modal-confirm-label { font-size: 0.82rem; color: var(--dim); margin-bottom: 8px; }
.delete-modal-username { color: var(--text); }
.delete-modal-input {
  width: 100%;
  background: rgb(var(--c-glass) / 0.05);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text); font-size: 0.9rem; font-family: inherit;
  padding: 10px 14px; outline: none;
  transition: border-color 0.2s; box-sizing: border-box; margin-bottom: 6px;
}
.delete-modal-input:focus { border-color: var(--danger); box-shadow: 0 0 0 3px rgba(239,68,68,0.15); }
.delete-modal-error { font-size: 0.78rem; color: var(--danger); margin: 4px 0 12px; }
.delete-modal-actions { display: flex; gap: 10px; margin-top: 20px; }
.btn-delete-cancel {
  flex: 1;
  background: rgb(var(--c-glass) / 0.06);
  border: 1px solid var(--border); color: var(--mid);
  font-size: 0.88rem; font-family: inherit; font-weight: 500;
  padding: 10px 16px; border-radius: 10px; cursor: pointer;
  transition: background 0.15s;
}
.btn-delete-cancel:hover:not(:disabled) { background: rgb(var(--c-glass) / 0.1); }
.btn-delete-cancel:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-delete-confirm {
  flex: 2;
  background: linear-gradient(135deg, #b91c1c, #ef4444);
  border: none; color: #fff;
  font-size: 0.88rem; font-family: inherit; font-weight: 700;
  padding: 10px 16px; border-radius: 10px; cursor: pointer;
  transition: opacity 0.15s, filter 0.15s;
}
.btn-delete-confirm:hover:not(:disabled) { filter: brightness(1.12); }
.btn-delete-confirm:disabled { opacity: 0.35; cursor: not-allowed; filter: none; }
</style>
