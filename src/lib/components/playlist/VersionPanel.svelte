<script>
  import { onDestroy } from 'svelte';
  import VersionRow from './VersionRow.svelte';
  import VersionReport from './VersionReport.svelte';
  import { VersionPickerState } from './versionPicker.svelte.js';
  import { player } from './previewPlayer.svelte.js';
  import { toast } from '$lib/toast.svelte.js';

  let { track, store } = $props();

  // svelte-ignore state_referenced_locally
  const picker = new VersionPickerState(track, (path, opts) => store.api(path, opts));
  let showAlts = $state(false);
  let reporting = $state(false);

  onDestroy(() => { if (picker.playingId) player.stop(); });

  async function save() {
    const id = await picker.save();
    if (!id) return;
    store.setVideo(track.track_id, id);
    showAlts = false;
    toast('Version enregistrée pour toutes les playlists.', 'success');
  }
</script>

<div class="vpanel">
  {#if picker.playingId}
    <div class="vp-player">
      {#key picker.playingId}
        <iframe src="https://www.youtube-nocookie.com/embed/{picker.playingId}?autoplay=1&rel=0"
          title="Version jouée en partie" allow="autoplay; encrypted-media" allowfullscreen></iframe>
      {/key}
    </div>
  {/if}

  <div class="vp-bar" aria-live="polite">
    {#if picker.loading}
      <span class="vp-status">Recherche de la version jouée...</span>
    {:else if picker.locked}
      <span class="vp-badge">✓ Version vérifiée</span>
      {#if !picker.playingId}<button class="vp-link" onclick={() => picker.play(picker.lockedId)}>▶ Écouter</button>{/if}
      <button class="vp-link" onclick={() => reporting = !reporting}>Pas la bonne version ?</button>
    {:else}
      <span class="vp-status">{picker.selectedId === picker.autoId && !picker.pastedId ? 'Version choisie automatiquement' : 'Autre version sélectionnée'}</span>
      <button class="vp-link" onclick={() => showAlts = !showAlts} aria-expanded={showAlts}>
        {showAlts ? 'Masquer' : 'Changer de version'}
      </button>
    {/if}
    {#if picker.playingId}
      <a class="vp-link" href="https://www.youtube.com/watch?v={picker.playingId}" target="_blank" rel="noopener noreferrer">YouTube ↗</a>
    {/if}
  </div>

  {#if picker.error}<p class="vp-status err">{picker.error}</p>{/if}

  {#if reporting}
    <VersionReport {track} trackId={track.track_id} videoId={picker.lockedId} onDone={() => reporting = false} />
  {/if}

  {#if !picker.loading && !picker.locked && (showAlts || !picker.candidates.length)}
    <div class="vp-list" role="radiogroup" aria-label="Versions trouvées">
      {#each picker.candidates as v (v.id)}
        <VersionRow video={v}
          selected={!picker.pastedId && picker.selectedId === v.id}
          auto={picker.autoId === v.id}
          playing={picker.playingId === v.id}
          onSelect={() => { picker.select(v.id); picker.play(v.id); }}
          onPlay={() => picker.play(v.id)} />
      {/each}
    </div>
    <div class="vp-paste">
      <input type="url" inputmode="url" class="input-glass" placeholder="Ou colle un lien YouTube"
        aria-label="Lien YouTube" bind:value={picker.pasteInput} aria-invalid={picker.pasteInvalid} />
      {#if picker.pastedId}
        <button class="btn-ghost sm" onclick={() => picker.play(picker.pastedId)} aria-label="Écouter le lien collé">
          {picker.playingId === picker.pastedId ? '■' : '▶'}
        </button>
      {/if}
      <button class="btn-accent sm" onclick={save} disabled={!picker.canSave}>{picker.busy ? '...' : 'Garder celle-ci'}</button>
    </div>
    {#if picker.pasteInvalid}<p class="vp-status err">Lien YouTube non reconnu.</p>{/if}
    <p class="vp-hint">Le choix vaut pour toutes les playlists. Version spéciale (8-bit, remix) ? Ajoute-la plutôt comme un titre à part.</p>
  {/if}
</div>

<style>
  .vpanel { padding: 4px 0 14px 34px; display: flex; flex-direction: column; gap: 8px; }
  .vp-player { aspect-ratio: 16 / 9; max-width: 420px; background: #000; border-radius: 8px; overflow: hidden; }
  .vp-player iframe { width: 100%; height: 100%; border: 0; display: block; }
  .vp-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 14px; }
  .vp-status { font-size: 0.75rem; color: var(--mid); }
  .vp-status.err { color: var(--danger); margin: 0; }
  .vp-badge { font-size: 0.72rem; font-weight: 700; color: var(--success); }
  .vp-link {
    border: none;
    background: none;
    padding: 6px 0;
    color: var(--accent);
    font-size: 0.75rem;
    cursor: pointer;
    text-decoration: none;
  }
  .vp-link:hover { text-decoration: underline; }
  .vp-list { display: flex; flex-direction: column; gap: 6px; max-width: 560px; }
  .vp-paste { display: flex; gap: 6px; max-width: 560px; }
  .vp-paste input { flex: 1; min-width: 0; min-height: 40px; }
  .vp-paste button { min-height: 40px; }
  .vp-hint { font-size: 0.68rem; color: var(--dim); margin: 0; max-width: 560px; }
  @media (max-width: 600px) {
    .vpanel { padding-left: 0; }
    .vp-paste { flex-wrap: wrap; }
    .vp-paste .btn-accent { flex: 1 1 100%; }
  }
</style>
