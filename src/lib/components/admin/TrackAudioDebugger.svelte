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
  let saving  = $state(false);
  let saved   = $state(false);

  let query        = $state('');
  let searching    = $state(false);
  let results      = $state(null);
  let searchErrors = $state([]);
  let choisi       = $state(null);

  const ORDRE = [
    ['catalogue', 'Catalogue'],
    ['recherche', 'Recherche'],
    ['ytdlp', 'yt-dlp'],
    ['proxy', 'Proxy audio'],
    ['deezer', 'Deezer'],
    ['itunes', 'iTunes'],
  ];

  async function tester() {
    loading = true; erreur = ''; saved = false;
    try {
      const res = await fetch(`/api/admin/track-audio-debug?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId }),
      });
      const d = await res.json();
      if (!res.ok) { erreur = d.error || 'Erreur'; return; }
      report = d;
      if (!query.trim()) query = `${d.track.artist} ${d.track.title}`.trim();
    } catch { erreur = 'Erreur réseau.'; }
    finally { loading = false; }
  }

  async function chercher() {
    if (!query.trim()) return;
    searching = true; erreur = ''; saved = false; choisi = null;
    try {
      const res = await fetch(`/api/admin/track-audio-search?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const d = await res.json();
      if (!res.ok) { erreur = d.error || 'Erreur'; return; }
      results = d.results;
      searchErrors = d.errors ?? [];
    } catch { erreur = 'Erreur réseau.'; }
    finally { searching = false; }
  }

  // On n'enregistre que ce qui a été écouté : le bouton n'apparaît qu'après
  // sélection d'une proposition, et n'écrit que sa source.
  async function utiliser(r) {
    saving = true; erreur = '';
    try {
      const res = await fetch(`/api/admin/track-audio-fix?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId,
          previewUrl: r.previewUrl,
          externalId: r.externalId || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) { erreur = d.error || 'Erreur'; return; }
      saved = true;
      choisi = r;
      await tester();
    } catch { erreur = 'Erreur réseau.'; }
    finally { saving = false; }
  }

  function duree(s) {
    if (!s) return '';
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
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

    <div class="tad-search">
      <input
        bind:value={query}
        placeholder="Rechercher un titre de remplacement"
        onkeydown={e => { if (e.key === 'Enter') chercher(); }}
      >
      <button onclick={chercher} disabled={searching || !query.trim()}>
        {searching ? 'Recherche…' : 'Chercher'}
      </button>
    </div>

    {#each searchErrors as e (e)}
      <p class="tad-hint">{e}</p>
    {/each}

    {#if results}
      {#if results.length}
        <p class="tad-hint">Écoute puis choisis : la source du titre sera remplacée.</p>
        <ul class="tad-res">
          {#each results as r (r.source + (r.externalId ?? r.previewUrl))}
            <li class:chosen={choisi?.previewUrl === r.previewUrl}>
              {#if r.cover}<img src={r.cover} alt="" width="40" height="40">{/if}
              <div class="tad-res-txt">
                <span class="tad-res-t">{r.title}</span>
                <span class="tad-res-a">{r.artist}{r.album ? ` · ${r.album}` : ''}{r.duration ? ` · ${duree(r.duration)}` : ''}</span>
                <span class="tad-res-src">{r.source}</span>
              </div>
              <!-- svelte-ignore a11y_media_has_caption -->
              <audio controls preload="none" src={r.previewUrl}></audio>
              <button class="tad-use" onclick={() => utiliser(r)} disabled={saving}>
                {saving ? '…' : 'Utiliser'}
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="tad-hint">Aucun extrait écoutable pour cette recherche.</p>
      {/if}
    {/if}

    {#if saved}
      <p class="tad-ok">
        Source remplacée{choisi ? ` par « ${choisi.title} » de ${choisi.artist}` : ''}.
      </p>
    {/if}
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
  .tad-search { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
  .tad-search input {
    flex: 1 1 260px;
    padding: 6px 10px;
    font-family: inherit;
  }
  .tad-search button { padding: 6px 12px; cursor: pointer; font-family: inherit; }

  .tad-res {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .tad-res li {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 8px;
    border: 1px solid var(--border, rgb(var(--c-glass) / 0.08));
    border-radius: 10px;
  }
  .tad-res li.chosen { border-color: #4ade80; }
  .tad-res img { border-radius: 4px; flex-shrink: 0; }
  .tad-res-txt {
    display: flex;
    flex-direction: column;
    min-width: 150px;
    flex: 1 1 150px;
  }
  .tad-res-t {
    color: var(--text, #f1f5f9);
    font-size: 0.85rem;
    font-weight: 600;
  }
  .tad-res-a { color: var(--mid, #94a3b8); font-size: 0.78rem; }
  .tad-res-src {
    color: var(--dim, #64748b);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .tad-res audio { width: 220px; margin: 0; flex-shrink: 0; }
  .tad-use {
    padding: 6px 14px;
    cursor: pointer;
    font-family: inherit;
    flex-shrink: 0;
  }
  .tad-use:disabled { opacity: 0.45; cursor: not-allowed; }
  .tad-err { color: var(--danger, #ef4444); font-size: 0.82rem; }
  .tad-hint { color: var(--dim, #64748b); font-size: 0.78rem; margin-top: 8px; }
  .tad-ok { color: #4ade80; font-size: 0.82rem; margin-top: 8px; }
  audio { width: 100%; margin-top: 12px; }
</style>
