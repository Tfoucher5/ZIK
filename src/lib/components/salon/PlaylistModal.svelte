<script>
  import PlaylistPicker from './PlaylistPicker.svelte';

  let {
    playlists = [],
    selectedIds = $bindable([]),
    live = false,
    remaining = 0,
    saving = false,
    error = '',
    onSave,
    onClose,
  } = $props();
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') onClose(); }} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="pm-backdrop" onclick={onClose}>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="pm" role="dialog" aria-modal="true" aria-labelledby="pm-title" onclick={(e) => e.stopPropagation()}>
    <header class="pm-head">
      <div>
        <h2 id="pm-title">Changer de playlist</h2>
        <p>
          {#if live}
            La manche en cours va au bout, puis les <b>{remaining} manches restantes</b> sont tirées dans la nouvelle sélection. Les scores ne bougent pas.
          {:else}
            La sélection s'applique à la prochaine partie. Les scores ne bougent pas.
          {/if}
        </p>
      </div>
      <button class="pm-close" onclick={onClose} aria-label="Fermer">×</button>
    </header>

    <div class="pm-body">
      <PlaylistPicker {playlists} bind:selectedIds />
    </div>

    <footer class="pm-foot">
      {#if error}<p class="pm-error">{error}</p>{/if}
      <button class="sx-btn" onclick={onClose}>Annuler</button>
      <button class="sx-btn sx-btn-primary" onclick={onSave} disabled={saving || selectedIds.length === 0}>
        {saving ? 'Chargement…' : 'Valider'}
      </button>
    </footer>
  </div>
</div>

<style>
  .pm-backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    padding: 20px;
    background: var(--overlay);
  }
  .pm {
    display: flex;
    flex-direction: column;
    width: min(900px, 100%);
    max-height: min(820px, 90vh);
    background: var(--bg);
    border: 2px solid var(--text);
    border-radius: 3px;
  }
  .pm-head {
    display: flex;
    gap: 20px;
    padding: 24px 28px 16px;
    border-bottom: 1px solid var(--border);
  }
  .pm-head h2 {
    font-family: var(--s-cond);
    font-size: 1.8rem;
    font-weight: 900;
    text-transform: uppercase;
  }
  .pm-head p {
    margin-top: 4px;
    font-size: 0.88rem;
    line-height: 1.5;
    color: var(--mid);
  }
  .pm-head b {
    color: var(--text);
  }
  .pm-close {
    margin-left: auto;
    align-self: flex-start;
    width: 36px;
    height: 36px;
    background: none;
    border: 1px solid var(--border2);
    border-radius: 3px;
    color: var(--text);
    font-size: 1.3rem;
    cursor: pointer;
  }
  .pm-body {
    flex: 1;
    min-height: 0;
    padding: 20px 28px;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .pm-foot {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 28px;
    border-top: 1px solid var(--border);
  }
  .pm-error {
    margin-right: auto;
    color: var(--danger);
    font-size: 0.88rem;
  }
</style>
