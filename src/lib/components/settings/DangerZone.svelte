<script>
  import SettingsSection from './SettingsSection.svelte';

  let { onDelete } = $props();
</script>

<SettingsSection title="⚠️ Zone dangereuse" danger>
  <div class="settings-row settings-row-danger">
    <div class="settings-row-info">
      <div class="settings-row-label">Supprimer mon compte</div>
      <div class="settings-row-desc">
        Supprime d&eacute;finitivement ton compte, ton profil, tes playlists et tous tes scores. <strong>Cette action est irr&eacute;versible.</strong>
      </div>
    </div>
    <button class="btn-danger" onclick={onDelete}>
      Supprimer
    </button>
  </div>
</SettingsSection>

<style>
.settings-row-danger { background: rgba(239,68,68,0.04); }
.btn-danger {
  flex-shrink: 0;
  background: rgba(239,68,68,0.12);
  border: 1px solid rgba(239,68,68,0.4);
  color: var(--danger);
  font-size: 0.82rem; font-weight: 600;
  padding: 7px 16px; border-radius: 8px;
  cursor: pointer; font-family: inherit;
  transition: background 0.15s, border-color 0.15s;
}
.btn-danger:hover { background: rgba(239,68,68,0.22); border-color: rgba(239,68,68,0.65); }
</style>
