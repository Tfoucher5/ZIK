<script>
  /**
   * TrackAudioDebugger — rejoue la chaîne audio d'un titre et permet de la corriger.
   * Props:
   *   trackId — identifiant du catalogue `tracks`
   *   token   — jeton super_admin
   */
  let { trackId, token } = $props();

  let report  = $state(null);
  let loading = $state(false);
  let erreur  = $state('');
  let extId   = $state('');
  let prevUrl = $state('');
  let saving  = $state(false);
  let saved   = $state(false);

  const ORDRE = [
    ['catalogue', 'Catalogue'],
    ['recherche', 'Recherche'],
    ['ytdlp', 'yt-dlp'],
    ['proxy', 'Proxy audio'],
    ['deezer', 'Deezer'],
    ['itunes', 'iTunes'],
  ];

  const testOk = $derived(Boolean(report?.playable));

  async function tester() {
    loading = true; erreur = ''; saved = false;
    try {
      const res = await fetch(`/api/admin/track-audio-debug?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId,
          overrideExternalId: extId.trim() || undefined,
          overridePreviewUrl: prevUrl.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) erreur = d.error || 'Erreur';
      else report = d;
    } catch { erreur = 'Erreur réseau.'; }
    finally { loading = false; }
  }

  async function enregistrer() {
    saving = true; erreur = '';
    try {
      const res = await fetch(`/api/admin/track-audio-fix?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId,
          previewUrl: prevUrl.trim() || report?.playable || undefined,
          externalId: extId.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) erreur = d.error || 'Erreur';
      else saved = true;
    } catch { erreur = 'Erreur réseau.'; }
    finally { saving = false; }
  }
</script>

<div class="tad">
  <button class="tad-run" onclick={tester} disabled={loading}>
    {loading ? 'Test en cours…' : 'Diagnostiquer'}
  </button>

  {#if erreur}<p class="tad-err">{erreur}</p>{/if}

  {#if report}
    <p class="tad-title">{report.track.artist} — {report.track.title}</p>

    <ul class="tad-steps">
      {#each ORDRE as [cle, libelle] (cle)}
        {#if report.steps[cle]}
          <li class:ok={report.steps[cle].ok}>
            <span class="tad-dot">{report.steps[cle].ok ? '✓' : '✕'}</span>
            <span class="tad-lbl">{libelle}</span>
            <span class="tad-detail">{report.steps[cle].detail}</span>
            {#if report.steps[cle].error}
              <span class="tad-why">{report.steps[cle].error}</span>
            {/if}
          </li>
        {/if}
      {/each}
    </ul>

    {#if report.playable}
      <!-- svelte-ignore a11y_media_has_caption -->
      <audio controls src={report.playable}></audio>
    {/if}

    <div class="tad-fix">
      <input bind:value={extId} placeholder="Forcer un external_id Deezer">
      <input bind:value={prevUrl} placeholder="Forcer une URL de preview">
      <button onclick={tester} disabled={loading}>Retester</button>
      <button class="tad-save" onclick={enregistrer} disabled={!testOk || saving}>
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>

    {#if !testOk}
      <p class="tad-hint">Aucune source jouable : l'enregistrement reste bloqué.</p>
    {/if}
    {#if saved}<p class="tad-ok">Enregistré.</p>{/if}
  {/if}
</div>

<style>
  .tad {
    border: 1px solid var(--border, rgb(var(--c-glass) / 0.08));
    border-radius: 12px;
    padding: 14px;
    margin-top: 10px;
  }
  .tad-run { padding: 7px 14px; cursor: pointer; font-family: inherit; }
  .tad-title { font-weight: 700; margin: 12px 0 8px; color: var(--text, #f1f5f9); }
  .tad-steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .tad-steps li {
    display: grid;
    grid-template-columns: 18px 90px 1fr;
    gap: 8px;
    font-size: 0.82rem;
    color: var(--mid, #94a3b8);
  }
  .tad-dot { color: var(--danger, #ef4444); }
  .tad-steps li.ok .tad-dot { color: #4ade80; }
  .tad-lbl { color: var(--text, #f1f5f9); }
  .tad-detail { word-break: break-all; }
  .tad-why {
    grid-column: 3;
    color: var(--danger, #ef4444);
    font-size: 0.78rem;
  }
  .tad-fix { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .tad-fix input {
    flex: 1 1 220px;
    padding: 6px 10px;
    font-family: inherit;
  }
  .tad-fix button { padding: 6px 12px; cursor: pointer; font-family: inherit; }
  .tad-save:disabled { opacity: 0.45; cursor: not-allowed; }
  .tad-err { color: var(--danger, #ef4444); font-size: 0.82rem; }
  .tad-hint { color: var(--dim, #64748b); font-size: 0.78rem; margin-top: 8px; }
  .tad-ok { color: #4ade80; font-size: 0.82rem; margin-top: 8px; }
  audio { width: 100%; margin-top: 12px; }
</style>
