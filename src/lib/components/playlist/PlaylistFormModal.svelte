<script>
  import { toast } from '$lib/toast.svelte.js';

  let { open, playlist = null, store, onClose } = $props();

  let name = $state('');
  let isPublic = $state(false);
  let error = $state('');
  let saving = $state(false);
  let inputEl = $state();

  $effect(() => {
    if (!open) return;
    name = playlist?.name ?? '';
    isPublic = playlist?.is_public ?? false;
    error = '';
    setTimeout(() => inputEl?.focus(), 60);
  });

  async function save() {
    if (!name.trim()) { error = 'Le nom est requis.'; return; }
    saving = true; error = '';
    try {
      await store.save({ name: name.trim(), emoji: playlist?.emoji ?? '🎵', is_public: isPublic }, playlist);
      toast(playlist ? 'Playlist mise à jour' : 'Playlist créée !', 'success');
      onClose();
    } catch (e) { error = e.message; }
    saving = false;
  }

  async function remove() {
    if (!confirm(`Supprimer "${playlist.name}" ? Cette action est irréversible.`)) return;
    try {
      await store.remove();
      toast('Playlist supprimée.', 'success');
      onClose();
    } catch (e) { toast('Erreur suppression : ' + e.message, 'error'); }
  }
</script>

<svelte:window onkeydown={(e) => { if (open && e.key === 'Escape') onClose(); }} />

{#if open}
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="plc-title" onclick={e => { if (e.target === e.currentTarget) onClose(); }}>
  <div class="modal modal-pl-create">
    <div class="plc-head">
      <span class="plc-eyebrow" id="plc-title">{playlist ? 'Réglages de la playlist' : 'Nouvelle playlist'}</span>
      <button class="close-btn" onclick={onClose} aria-label="Fermer">&#x2715;</button>
    </div>

    <div class="plc-fields">
      <div class="plc-field">
        <label class="plc-label" for="pl-name-input">Nom</label>
        <input id="pl-name-input" bind:this={inputEl} type="text" bind:value={name} placeholder="MA PLAYLIST" maxlength="60" class="plc-name-input"
          onkeydown={e => { if (e.key === 'Enter') save(); }}>
      </div>
      <div class="plc-field">
        <span class="plc-label">Visibilité</span>
        <div class="plc-seg" role="radiogroup" aria-label="Visibilité">
          <button class="plc-seg-btn" class:on={!isPublic} role="radio" aria-checked={!isPublic} onclick={() => isPublic = false}>Privée</button>
          <button class="plc-seg-btn" class:on={isPublic} role="radio" aria-checked={isPublic} onclick={() => isPublic = true}>Publique</button>
        </div>
      </div>
    </div>

    {#if error}<div class="alert-err">{error}</div>{/if}
    <div class="modal-footer">
      {#if playlist}<button class="plc-del" onclick={remove}>Supprimer</button>{/if}
      <button class="btn-ghost" onclick={onClose}>Annuler</button>
      <button class="btn-accent" onclick={save} disabled={saving}>{saving ? '...' : playlist ? 'Enregistrer' : 'Créer'}</button>
    </div>
  </div>
</div>
{/if}

<style>
.overlay { z-index: 700; }
/* ── Modale création / modification ──────────────────────────────────────── */
.modal-pl-create { max-width: 480px; }
.plc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.plc-eyebrow {
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 700;
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--accent);
}
.plc-fields { display: flex; flex-direction: column; gap: 22px; margin-bottom: 4px; }
.plc-field { display: flex; flex-direction: column; gap: 8px; }
.plc-label {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--dim);
}
.plc-name-input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border2);
  color: var(--text);
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 900;
  font-size: 1.6rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 0 10px;
  outline: none;
  transition: border-color 0.15s;
}
.plc-name-input::placeholder { color: var(--dim); }
.plc-name-input:focus { border-color: var(--accent); }
.plc-seg { display: flex; }
.plc-seg-btn {
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 700;
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 8px 20px;
  border: 1px solid var(--border2);
  border-right: none;
  background: transparent;
  color: var(--dim);
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.plc-seg-btn:last-child { border-right: 1px solid var(--border2); }
.plc-seg-btn.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }

.modal-footer {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  justify-content: flex-end;
}
.plc-del {
  margin-right: auto;
  background: transparent;
  border: none;
  color: var(--danger);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 8px 0;
}
.plc-del:hover { text-decoration: underline; }
</style>
